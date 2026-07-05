import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CreateEventSchema, type CreateEventInput } from '@webhook/shared';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { CurrentApplication } from '../auth/current-application.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { EventsService } from './events.service';
import type { Application } from '@prisma/client';

@Controller('events')
@UseGuards(ApiKeyGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @HttpCode(202)
  async create(
    @CurrentApplication() application: Application,
    @Body(new ZodValidationPipe(CreateEventSchema)) body: CreateEventInput,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const event = await this.eventsService.createEvent(
      application,
      body,
      idempotencyKey,
    );
    return { id: event.id, status: event.status, createdAt: event.createdAt };
  }
}
