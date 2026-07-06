"use client";

import { useActionState } from "react";
import { createEndpointAction, type EndpointFormState } from "@/app/actions/endpoints";

const initialState: EndpointFormState = {};

export function CreateEndpointForm() {
  const [state, formAction, pending] = useActionState(createEndpointAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded border border-black/10 p-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="url" className="text-xs font-medium text-black/60">
          URL du destinataire
        </label>
        <input
          id="url"
          name="url"
          type="url"
          placeholder="https://exemple.com/webhook"
          required
          className="w-72 rounded border border-black/15 px-2 py-1.5 text-sm outline-none focus:border-black/40"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-xs font-medium text-black/60">
          Description (optionnel)
        </label>
        <input
          id="description"
          name="description"
          type="text"
          className="w-56 rounded border border-black/15 px-2 py-1.5 text-sm outline-none focus:border-black/40"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Création..." : "Ajouter"}
      </button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
