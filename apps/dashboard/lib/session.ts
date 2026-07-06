import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Auth "socle" (étape 5) : pas de compte utilisateur, on colle directement la
// clé API de l'Application. Stockée en cookie httpOnly, jamais exposée au JS
// client — c'est le NestJS ApiKeyGuard qui reste la seule vraie frontière de
// sécurité (voir la garde côté serveur dans chaque appel de lib/api.ts).
const COOKIE_NAME = "webhook_api_key";
const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;

export async function getApiKey(): Promise<string> {
  const apiKey = (await cookies()).get(COOKIE_NAME)?.value;
  if (!apiKey) {
    redirect("/login");
  }
  return apiKey;
}

export async function getApiKeyOrNull(): Promise<string | null> {
  return (await cookies()).get(COOKIE_NAME)?.value ?? null;
}

export async function setApiKey(apiKey: string): Promise<void> {
  (await cookies()).set(COOKIE_NAME, apiKey, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: THIRTY_DAYS_SECONDS,
  });
}

export async function clearApiKey(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}