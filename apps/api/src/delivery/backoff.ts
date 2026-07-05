// Paramètres de retry (voir ADR-002). Index = tentative qui vient d'échouer
// (1-based) → délai avant la tentative suivante.
// 5 paliers = 5 réessais programmés après un échec initial, soit 6 tentatives
// possibles au total avant le passage en dead letter (statut FAILED).
export const RETRY_DELAYS_MS = [
  10_000, // 10s après la tentative 1
  60_000, // 1min après la tentative 2
  600_000, // 10min après la tentative 3
  3_600_000, // 1h après la tentative 4
  21_600_000, // 6h après la tentative 5
];

const JITTER_RATIO = 0.2; // ±20%, pour éviter un effet de troupeau sur les retries groupés

// Retourne le délai (ms, avec jitter) avant la prochaine tentative, ou `null`
// si le nombre de paliers est épuisé (→ dead letter, pas de programmation).
export function computeBackoffDelayMs(
  failedAttemptNumber: number,
): number | null {
  const base = RETRY_DELAYS_MS[failedAttemptNumber - 1];
  if (base === undefined) {
    return null;
  }
  const jitterFactor = 1 - JITTER_RATIO + Math.random() * (2 * JITTER_RATIO);
  return Math.round(base * jitterFactor);
}
