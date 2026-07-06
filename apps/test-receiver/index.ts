// Récepteur de test contrôlable (PLAN.md étape 2), réutilisé jusqu'à l'étape 8.
// Le scénario se pilote via l'URL de l'Endpoint elle-même (query params), pas
// par un état interne — ça permet de tester plusieurs comportements en
// parallèle sans coordination entre process.
//
// Exemples d'URL d'Endpoint :
//   http://localhost:4000/webhook                         → 200 immédiat
//   http://localhost:4000/webhook?status=500               → simule un échec destinataire
//   http://localhost:4000/webhook?delayMs=6000              → dépasse le timeout worker (5s, étape 2)
//   http://localhost:4000/webhook?secret=whsec_xxx          → vérifie la signature HMAC (étape 4)
//
// Pour la démo de chaos (étape 3, "destinataire coupé 10 min") : tuer ce
// process (Ctrl+C) suffit, les connexions échoueront avec ECONNREFUSED.

import { createHmac, timingSafeEqual } from 'node:crypto';

const PORT = Number(process.env['PORT'] ?? 4000);
const MAX_SIGNATURE_AGE_SECONDS = 300; // 5 min, anti-rejeu (ADR-003)

// Snippet de vérification tel que documenté pour les destinataires
// (apps/api/README.md) — le récepteur de test l'applique sur lui-même pour
// prouver le critère de fin de l'étape 4 : rejet d'un payload trafiqué ou
// d'une signature rejouée.
function verifySignature(
  secret: string,
  timestampHeader: string | null,
  signatureHeader: string | null,
  rawBody: string,
): { valid: boolean; reason?: string } {
  if (!timestampHeader || !signatureHeader) {
    return { valid: false, reason: 'en-têtes de signature manquants' };
  }

  const timestamp = Number(timestampHeader);
  const ageSeconds = Math.abs(Date.now() / 1000 - timestamp);
  if (!Number.isFinite(timestamp) || ageSeconds > MAX_SIGNATURE_AGE_SECONDS) {
    return { valid: false, reason: `timestamp hors fenêtre (${Math.round(ageSeconds)}s)` };
  }

  const expected = createHmac('sha256', secret).update(`${timestampHeader}.${rawBody}`).digest('hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  const receivedBuf = Buffer.from(signatureHeader, 'hex');
  if (expectedBuf.length !== receivedBuf.length || !timingSafeEqual(expectedBuf, receivedBuf)) {
    return { valid: false, reason: 'signature invalide' };
  }

  return { valid: true };
}

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const status = Number(url.searchParams.get('status') ?? 200);
    const delayMs = Number(url.searchParams.get('delayMs') ?? 0);
    const secret = url.searchParams.get('secret');
    const body = req.method === 'GET' || req.method === 'HEAD' ? null : await req.text();

    console.log(
      `[receiver] ${req.method} ${url.pathname}${url.search} — répond ${status} après ${delayMs}ms`,
    );
    if (body) {
      console.log(`[receiver]   body: ${body.slice(0, 500)}`);
    }

    if (secret) {
      const result = verifySignature(
        secret,
        req.headers.get('x-webhook-timestamp'),
        req.headers.get('x-webhook-signature'),
        body ?? '',
      );
      if (!result.valid) {
        console.log(`[receiver]   signature rejetée : ${result.reason}`);
        return new Response(JSON.stringify({ error: result.reason }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        });
      }
      console.log('[receiver]   signature valide');
    }

    if (delayMs > 0) {
      await Bun.sleep(delayMs);
    }

    return new Response(JSON.stringify({ received: true }), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  },
});

console.log(`Récepteur de test démarré sur http://localhost:${PORT}`);
