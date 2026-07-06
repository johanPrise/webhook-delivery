"use client";

import { useActionState } from "react";
import { regenerateApiKeyAction, type RegenerateState } from "@/app/actions/application";

const initialState: RegenerateState = {};

export function RegenerateKeyButton() {
  const [state, formAction, pending] = useActionState(regenerateApiKeyAction, initialState);

  return (
    <div className="flex flex-col gap-3">
      <form action={formAction}>
        <button
          type="submit"
          disabled={pending}
          className="rounded border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          {pending ? "Régénération..." : "Régénérer la clé API"}
        </button>
      </form>
      {state.newApiKey && (
        <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm">
          <p className="mb-1 font-medium text-amber-900">
            Nouvelle clé — copiez-la maintenant, elle ne sera plus jamais affichée :
          </p>
          <code className="break-all text-xs">{state.newApiKey}</code>
        </div>
      )}
    </div>
  );
}
