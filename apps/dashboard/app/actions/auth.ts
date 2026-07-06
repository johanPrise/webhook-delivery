"use server";

import { redirect } from "next/navigation";
import { verifyApiKey } from "@/lib/api";
import { clearApiKey, setApiKey } from "@/lib/session";

export interface LoginState {
  error?: string;
}

export async function login(_prevState: LoginState | undefined, formData: FormData): Promise<LoginState> {
  const rawApiKey = formData.get("apiKey");
  const apiKey = (typeof rawApiKey === "string" ? rawApiKey : "").trim();
  if (!apiKey) {
    return { error: "Clé API requise" };
  }

  const valid = await verifyApiKey(apiKey);
  if (!valid) {
    return { error: "Clé API invalide" };
  }

  await setApiKey(apiKey);
  redirect("/events");
}

export async function logout(): Promise<void> {
  await clearApiKey();
  redirect("/login");
}