import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { CreateEndpointInput, UpdateEndpointInput } from '@webhook/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EndpointsService {
  constructor(private readonly prisma: PrismaService) {}

  // Le secret reste consultable (contrairement à la clé API, hashée) : le
  // serveur doit le connaître en clair pour signer chaque livraison, et
  // l'intégrateur doit pouvoir le retrouver pour configurer sa vérification
  // (ADR-003). Toujours scopé à l'application authentifiée.
  list(applicationId: string) {
    return this.prisma.endpoint.findMany({
      where: { applicationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(applicationId: string, endpointId: string) {
    const endpoint = await this.prisma.endpoint.findFirst({
      where: { id: endpointId, applicationId },
    });
    if (!endpoint) {
      throw new NotFoundException('Endpoint introuvable');
    }
    return endpoint;
  }

  create(applicationId: string, input: CreateEndpointInput) {
    const secret = `whsec_${randomBytes(24).toString('hex')}`;
    return this.prisma.endpoint.create({
      data: {
        applicationId,
        url: input.url,
        description: input.description,
        secret,
      },
    });
  }

  async update(
    applicationId: string,
    endpointId: string,
    input: UpdateEndpointInput,
  ) {
    await this.findOne(applicationId, endpointId); // 404 si hors périmètre de l'application
    return this.prisma.endpoint.update({
      where: { id: endpointId },
      data: input,
    });
  }
}
