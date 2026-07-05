import { createHash, randomBytes } from 'node:crypto';

const API_KEY_PREFIX = 'whk';

// Clé au format `whk_<32 octets hex>`, jamais stockée en clair (voir Application.apiKeyHash).
export function generateApiKey(): string {
  return `${API_KEY_PREFIX}_${randomBytes(32).toString('hex')}`;
}

export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}
