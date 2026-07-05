import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, type Application, type Event } from '@prisma/client';
import type { CreateEventInput } from '@webhook/shared';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
  ) {}

  async createEvent(
    application: Application,
    input: CreateEventInput,
    idempotencyKey: string | undefined,
  ): Promise<Event> {
    const endpoint = await this.prisma.endpoint.findFirst({
      where: { id: input.endpointId, applicationId: application.id },
    });
    if (!endpoint) {
      throw new BadRequestException('Unknown endpoint for this application');
    }

    // Ordre impératif (ADR-001) : persister d'abord. La création est le seul
    // point où l'idempotence est tranchée, via la contrainte unique en base
    // (applicationId, idempotencyKey) — pas de lecture-puis-écriture fragile.
    try {
      const event = await this.prisma.event.create({
        data: {
          applicationId: application.id,
          endpointId: endpoint.id,
          type: input.type,
          payload: input.payload as Prisma.InputJsonValue,
          idempotencyKey: idempotencyKey ?? null,
        },
      });

      await this.queue.enqueueDelivery(event.id);
      return event;
    } catch (error) {
      if (
        idempotencyKey &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        // Rejeu : même (application, idempotencyKey) déjà reçu. On ne recrée
        // rien et on ne ré-enfile pas — l'événement d'origine suit déjà son cours.
        return await this.prisma.event.findUniqueOrThrow({
          where: {
            applicationId_idempotencyKey: {
              applicationId: application.id,
              idempotencyKey,
            },
          },
        });
      }
      throw error;
    }
  }
}
