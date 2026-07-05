import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { computeBackoffDelayMs } from './backoff';

const DELIVERY_TIMEOUT_MS = 5000;
const RESPONSE_BODY_MAX_LENGTH = 2000;

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
  ) {}

  // Appelé par le worker BullMQ. Ne fait jamais confiance au job : l'ID est
  // le seul contenu transporté (ADR-001), l'état réel est relu ici.
  async attemptDelivery(eventId: string): Promise<void> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { endpoint: true },
    });

    if (!event) {
      this.logger.warn(`Event ${eventId} introuvable, job ignoré`);
      return;
    }
    if (event.status === 'DELIVERED') {
      this.logger.log(`Event ${eventId} déjà livré, job ignoré`);
      return;
    }

    const attemptNumber = event.attemptCount + 1;
    const startedAt = performance.now();

    let statusCode: number | null = null;
    let success = false;
    let responseBody: string | null = null;
    let error: string | null = null;

    try {
      const response = await fetch(event.endpoint.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: event.id,
          type: event.type,
          payload: event.payload,
        }),
        signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
      });
      statusCode = response.status;
      success = response.ok;
      responseBody = (await response.text()).slice(0, RESPONSE_BODY_MAX_LENGTH);
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }

    const durationMs = Math.round(performance.now() - startedAt);

    // Backoff exponentiel + jitter, dead letter après épuisement des paliers
    // (ADR-002). `null` = plus de palier disponible → FAILED, terminal.
    const retryDelayMs = success ? null : computeBackoffDelayMs(attemptNumber);
    const status = success
      ? 'DELIVERED'
      : retryDelayMs !== null
        ? 'RETRYING'
        : 'FAILED';
    const nextAttemptAt =
      retryDelayMs !== null ? new Date(Date.now() + retryDelayMs) : null;

    await this.prisma.$transaction([
      this.prisma.deliveryAttempt.create({
        data: {
          eventId: event.id,
          attemptNumber,
          statusCode,
          success,
          durationMs,
          responseBody,
          error,
        },
      }),
      this.prisma.event.update({
        where: { id: event.id },
        data: { attemptCount: attemptNumber, status, nextAttemptAt },
      }),
    ]);

    this.logger.log(
      `Event ${event.id} tentative #${attemptNumber} → ${success ? 'OK' : 'ÉCHEC'} ` +
        `(${statusCode ?? 'sans réponse'}, ${durationMs}ms) — statut ${status}` +
        (retryDelayMs !== null
          ? `, prochain essai dans ${Math.round(retryDelayMs / 1000)}s`
          : ''),
    );

    // En dehors de la transaction : la programmation du retry est un effet de
    // bord externe (Redis), jamais un motif d'échec de l'écriture en base.
    if (retryDelayMs !== null) {
      await this.queue.enqueueDelivery(event.id, retryDelayMs);
    }
  }
}
