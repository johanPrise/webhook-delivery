import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DELIVERY_TIMEOUT_MS = 5000;
const RESPONSE_BODY_MAX_LENGTH = 2000;

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(private readonly prisma: PrismaService) {}

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

    // Le statut RETRYING/backoff/dead-letter viennent à l'étape 3 : ici, une
    // seule tentative, tracée, l'événement reste PENDING s'il échoue.
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
        data: {
          attemptCount: attemptNumber,
          status: success ? 'DELIVERED' : event.status,
        },
      }),
    ]);

    this.logger.log(
      `Event ${event.id} tentative #${attemptNumber} → ${success ? 'OK' : 'ÉCHEC'} ` +
        `(${statusCode ?? 'sans réponse'}, ${durationMs}ms)`,
    );
  }
}
