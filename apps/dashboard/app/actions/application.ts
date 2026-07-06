"use server";

import { regenerateApiKey } from "@/lib/api";
import { setApiKey } from "@/lib/session";

export interface RegenerateState {
  newApiKey?: string;
}

export async function regenerateApiKeyAction(
  _prevState: RegenerateState | undefined,
): Promise<RegenerateState> {
  const newApiKey = await regenerateApiKey();
  // On doit re-poser le cookie tout de suite : l'ancienne clé vient d'être
  // révoquée côté API, sans ça la session courante deviendrait invalide.
  await setApiKey(newApiKey);
  return { newApiKey };
}