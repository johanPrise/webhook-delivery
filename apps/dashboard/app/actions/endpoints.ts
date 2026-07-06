"use server";

import { revalidatePath } from "next/cache";
import { CreateEndpointSchema } from "@webhook/shared";
import { createEndpoint, updateEndpoint } from "@/lib/api";

export interface EndpointFormState {
  error?: string;
}

export async function createEndpointAction(
  _prevState: EndpointFormState | undefined,
  formData: FormData,
): Promise<EndpointFormState> {
  const parsed = CreateEndpointSchema.safeParse({
    url: formData.get("url"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Entrée invalide" };
  }

  await createEndpoint(parsed.data);
  revalidatePath("/endpoints");
  return {};
}

// Formulaire à champs cachés plutôt que `bind` : évite toute ambiguïté sur la
// façon dont une Server Action reçoit des arguments liés + le FormData d'un
// <form>, on lit tout depuis `formData`.
export async function toggleEndpointAction(formData: FormData): Promise<void> {
  const rawId = formData.get("id");
  const id = typeof rawId === "string" ? rawId : "";
  const isActive = formData.get("isActive") === "true";
  await updateEndpoint(id, { isActive });
  revalidatePath("/endpoints");
}