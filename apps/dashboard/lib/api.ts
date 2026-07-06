import "server-only";
import { redirect } from "next/navigation";
import type {
  CreateEndpointInput,
  ListEventsQuery,
  UpdateEndpointInput,
} from "@webhook/shared";
import { getApiKey } from "./session";

const API_URL = process.env.API_URL ?? "http://localhost:3000";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// Tout appel passe par ici : la clé vient du cookie httpOnly (jamais du
// client), un 401 signifie clé révoquée/absente → on renvoie au login plutôt
// que d'afficher une page cassée.
async function apiFetch<T>(path: string, apiKey: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      ...init?.headers,
    },
  });

  if (response.status === 401) {
    redirect("/login");
  }
  if (!response.ok) {
    const body = await response.text();
    throw new ApiError(response.status, body || response.statusText);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

// Utilisé uniquement par le login : ne redirige pas sur 401, on veut afficher
// une erreur sur le formulaire au lieu de boucler vers /login.
export async function verifyApiKey(apiKey: string): Promise<boolean> {
  const response = await fetch(`${API_URL}/application`, {
    headers: { "x-api-key": apiKey },
  });
  return response.ok;
}

export interface ApplicationInfo {
  id: string;
  name: string;
  createdAt: string;
}

export interface Endpoint {
  id: string;
  applicationId: string;
  url: string;
  secret: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface EventSummary {
  id: string;
  applicationId: string;
  endpointId: string;
  type: string;
  payload: unknown;
  idempotencyKey: string | null;
  status: "PENDING" | "RETRYING" | "DELIVERED" | "FAILED";
  attemptCount: number;
  nextAttemptAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryAttempt {
  id: string;
  eventId: string;
  attemptNumber: number;
  statusCode: number | null;
  success: boolean;
  durationMs: number;
  responseBody: string | null;
  error: string | null;
  createdAt: string;
}

export interface EventDetail extends EventSummary {
  endpoint: { id: string; url: string; description: string | null };
  attempts: DeliveryAttempt[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export async function getApplication(): Promise<ApplicationInfo> {
  const apiKey = await getApiKey();
  return apiFetch<ApplicationInfo>("/application", apiKey);
}

export async function regenerateApiKey(): Promise<string> {
  const apiKey = await getApiKey();
  const result = await apiFetch<{ apiKey: string }>("/application/api-key/regenerate", apiKey, {
    method: "POST",
  });
  return result.apiKey;
}

export async function listEndpoints(): Promise<Endpoint[]> {
  const apiKey = await getApiKey();
  return apiFetch<Endpoint[]>("/endpoints", apiKey);
}

export async function createEndpoint(input: CreateEndpointInput): Promise<Endpoint> {
  const apiKey = await getApiKey();
  return apiFetch<Endpoint>("/endpoints", apiKey, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateEndpoint(id: string, input: UpdateEndpointInput): Promise<Endpoint> {
  const apiKey = await getApiKey();
  return apiFetch<Endpoint>(`/endpoints/${id}`, apiKey, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function listEvents(
  query: Partial<ListEventsQuery>,
): Promise<Paginated<EventSummary>> {
  const apiKey = await getApiKey();
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  const path = qs.length > 0 ? "/events?" + qs : "/events";
  return apiFetch<Paginated<EventSummary>>(path, apiKey);
}

export async function getEvent(id: string): Promise<EventDetail> {
  const apiKey = await getApiKey();
  return apiFetch<EventDetail>(`/events/${id}`, apiKey);
}