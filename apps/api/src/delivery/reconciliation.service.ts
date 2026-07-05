import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';

// Filet de sécurité promis par ADR-001 (corollaire 3) : rattrape les
// événements dont le job BullMQ a disparu sans que Postgres soit prévenu —
// crash entre persistance et enfilement, ou perte de données Redis (job
// différé non survécu à un redémarrage brutal, voir JOURNAL.md étape 3).
//
// La marge (grace period) évite de ré-enfiler un événement dont le job est
// simplement sur le point de s'exécuter normalement. Elle laisse une petite
// fenêtre de double-traitement possible si un job "juste en retard" et la
// réconciliation se croisent — accepté pour la V1, pas de verrou distribué.
const RECONCILIATION_GRACE_MS = 30_000;

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
  ) {}

  async reconcile(): Promise<void> {
    const cutoff = new Date(Date.now() - RECONCILIATION_GRACE_MS);

    const stuckEvents = await this.prisma.event.findMany({
      where: {
        OR: [
          // Persisté mais jamais tenté : l'enfilement initial a probablement échoué.
          { status: 'PENDING', createdAt: { lt: cutoff } },
          // Retry programmé mais jamais exécuté : le job différé a probablement été perdu.
          { status: 'RETRYING', nextAttemptAt: { lt: cutoff } },
        ],
      },
      select: { id: true, status: true },
    });

    if (stuckEvents.length === 0) {
      return;
    }

    this.logger.warn(
      `Réconciliation : ${stuckEvents.length} événement(s) bloqué(s), ré-enfilement`,
    );
    for (const event of stuckEvents) {
      await this.queue.enqueueDelivery(event.id);
    }
  }
}
