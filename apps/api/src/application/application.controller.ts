import { Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import type { Application } from '@prisma/client';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { CurrentApplication } from '../auth/current-application.decorator';
import { ApplicationService } from './application.service';

@Controller('application')
@UseGuards(ApiKeyGuard)
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  // Jamais apiKeyHash dans la réponse : c'est un hash, mais autant garder le
  // réflexe de ne jamais faire transiter ce champ vers un client.
  @Get()
  me(@CurrentApplication() application: Application) {
    return {
      id: application.id,
      name: application.name,
      createdAt: application.createdAt,
    };
  }

  @Post('api-key/regenerate')
  @HttpCode(200)
  async regenerateApiKey(@CurrentApplication() application: Application) {
    const apiKey = await this.applicationService.regenerateApiKey(
      application.id,
    );
    return { apiKey };
  }
}
