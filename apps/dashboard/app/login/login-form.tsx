"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/actions/auth";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-3">
      <label htmlFor="apiKey" className="text-sm font-medium">
        Clé API
      </label>
      <input
        id="apiKey"
        name="apiKey"
        type="password"
        placeholder="whk_..."
        autoComplete="off"
        required
        className="rounded border border-black/15 bg-transparent px-3 py-2 font-mono text-sm outline-none focus:border-black/40"
      />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Connexion..." : "Se connecter"}
      </button>
    </form>
  );
}