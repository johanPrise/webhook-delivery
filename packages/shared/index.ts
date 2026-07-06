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

// GET /events — filtres et pagination (étape 5, dashboard).
export const ListEventsQuerySchema = z.object({
  status: z.enum(["PENDING", "RETRYING", "DELIVERED", "FAILED"]).optional(),
  endpointId: z.string().min(1).optional(),
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListEventsQuery = z.infer<typeof ListEventsQuerySchema>;

// POST /endpoints
export const CreateEndpointSchema = z.object({
  url: z.url(),
  description: z.string().max(500).optional(),
});

export type CreateEndpointInput = z.infer<typeof CreateEndpointSchema>;

// PATCH /endpoints/:id — tout optionnel, mise à jour partielle.
export const UpdateEndpointSchema = z.object({
  url: z.url().optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateEndpointInput = z.infer<typeof UpdateEndpointSchema>;