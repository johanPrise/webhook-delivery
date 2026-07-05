import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { Worker } from 'bullmq';
import { WorkerModule } from './worker.module';
import { DeliveryService } from './delivery/delivery.service';
import { ReconciliationService } from './delivery/reconciliation.service';
import { EVENTS_QUEUE, type DeliveryJobData } from './queue/queue.constants';

const RECONCILIATION_INTERVAL_MS = 30_000;

async function bootstrap() {
  const logger = new Logger('DeliveryWorker');
  const appContext = await NestFactory.createApplicationContext(WorkerModule);
  const deliveryService = appContext.get(DeliveryService);
  const reconciliationService = appContext.get(ReconciliationService);

  const worker = new Worker<DeliveryJobData>(
    EVENTS_QUEUE,
    async (job) => {
      await deliveryService.attemptDelivery(job.data.eventId);
    },
    {
      connection: { url: process.env['REDIS_URL'] ?? 'redis://localhost:6379' },
    },
  );

  worker.on('failed', (job, err) => {
    logger.error(`Job ${job?.id} (event ${job?.data.eventId}) en échec`, err);
  });

  logger.log(
    `Worker de livraison démarré, écoute la file "${EVENTS_QUEUE}"...`,
  );

  // Filet de sécurité ADR-001 : rattrape les événements dont le job a
  // disparu (crash entre persistance et enfilement, perte Redis...).
  const reconciliationTimer = setInterval(() => {
    reconciliationService.reconcile().catch((error: unknown) => {
      logger.error('Échec du cycle de réconciliation', error);
    });
  }, RECONCILIATION_INTERVAL_MS);

  const shutdown = async () => {
    clearInterval(reconciliationTimer);
    await worker.close();
    await appContext.close();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

void bootstrap();
