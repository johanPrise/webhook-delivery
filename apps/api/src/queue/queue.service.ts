import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { DeliveryJobData, EVENTS_QUEUE } from './queue.constants';

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private readonly queue = new Queue<DeliveryJobData>(EVENTS_QUEUE, {
    connection: { url: process.env['REDIS_URL'] ?? 'redis://localhost:6379' },
  });

  // Postgres fait foi (ADR-001) : si l'enfilement échoue, l'événement reste
  // PENDING en base et sera repris par le job de réconciliation (étape 3).
  // On ne fait donc jamais échouer la requête d'ingestion pour ça.
  async enqueueDelivery(eventId: string, delayMs = 0): Promise<void> {
    try {
      await this.queue.add('deliver', { eventId }, { delay: delayMs });
    } catch (error) {
      this.logger.error(
        `Failed to enqueue delivery for event ${eventId}`,
        error,
      );
    }
  }

  async onModuleDestroy() {
    await this.queue.close();
  }
}
