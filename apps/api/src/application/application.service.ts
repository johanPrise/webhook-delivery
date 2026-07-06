import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { generateApiKey, hashApiKey } from '../auth/api-key.util';

@Injectable()
export class ApplicationService {
  constructor(private readonly prisma: PrismaService) {}

  // Régénère la clé API : révoque l'ancienne (son hash est écrasé, elle ne
  // matchera plus jamais) et retourne la nouvelle en clair, une seule fois —
  // même logique de non-réaffichage qu'à la création (voir seed.ts).
  async regenerateApiKey(applicationId: string): Promise<string> {
    const apiKey = generateApiKey();
    await this.prisma.application.update({
      where: { id: applicationId },
      data: { apiKeyHash: hashApiKey(apiKey) },
    });
    return apiKey;
  }
}
