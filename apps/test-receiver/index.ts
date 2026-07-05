// Récepteur de test contrôlable (PLAN.md étape 2), réutilisé jusqu'à l'étape 8.
// Le scénario se pilote via l'URL de l'Endpoint elle-même (query params), pas
// par un état interne — ça permet de tester plusieurs comportements en
// parallèle sans coordination entre process.
//
// Exemples d'URL d'Endpoint :
//   http://localhost:4000/webhook                 → 200 immédiat
//   http://localhost:4000/webhook?status=500       → simule un échec destinataire
//   http://localhost:4000/webhook?delayMs=6000     → dépasse le timeout worker (5s, étape 2)
//
// Pour la démo de chaos (étape 3, "destinataire coupé 10 min") : tuer ce
// process (Ctrl+C) suffit, les connexions échoueront avec ECONNREFUSED.

const PORT = Number(process.env['PORT'] ?? 4000);

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const status = Number(url.searchParams.get('status') ?? 200);
    const delayMs = Number(url.searchParams.get('delayMs') ?? 0);
    const body = req.method === 'GET' || req.method === 'HEAD' ? null : await req.text();

    console.log(
      `[receiver] ${req.method} ${url.pathname}${url.search} — répond ${status} après ${delayMs}ms`,
    );
    if (body) {
      console.log(`[receiver]   body: ${body.slice(0, 500)}`);
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
