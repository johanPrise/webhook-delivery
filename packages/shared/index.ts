import { z } from "zod";

// Payload envoyé par le client émetteur sur POST /events.
// L'application émettrice est déduite de la clé API (header), pas du body.
// La clé d'idempotence voyage dans le header `Idempotency-Key`, pas ici non plus.
export const CreateEventSchema = z.object({
  endpointId: z.string().min(1),
  type: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
});

export type CreateEventInput = z.infer<typeof CreateEventSchema>;

export const EventStatus = {
  PENDING: "PENDING",
  RETRYING: "RETRYING",
  DELIVERED: "DELIVERED",
  FAILED: "FAILED",
} as const;

export type EventStatus = (typeof EventStatus)[keyof typeof EventStatus];