import { createHmac } from 'node:crypto';

// Format (ADR-003) : HMAC-SHA256(secret, `${timestamp}.${rawBody}`).
// Le timestamp (secondes Unix) fait partie du message signé : signer le seul
// payload permettrait à quiconque intercepte une requête de la rejouer à
// l'identique indéfiniment, signature toujours valide.
export function signWebhookPayload(
  secret: string,
  timestampSeconds: number,
  rawBody: string,
): string {
  return createHmac('sha256', secret)
    .update(`${timestampSeconds}.${rawBody}`)
    .digest('hex');
}
