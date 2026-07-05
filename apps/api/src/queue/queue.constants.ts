// Nom de la file BullMQ des livraisons. Les jobs ne transportent que l'ID
// de l'événement (ADR-001) : le worker relit toujours l'état en base.
export const EVENTS_QUEUE = 'events';

export interface DeliveryJobData {
  eventId: string;
}
