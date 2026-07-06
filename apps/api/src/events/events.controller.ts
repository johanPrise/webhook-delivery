import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CreateEventSchema,
  ListEventsQuerySchema,
  type CreateEventInput,
  type ListEventsQuery,
} from '@webhook/shared';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { CurrentApplication } from '../auth/current-application.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { EventsService } from './events.service';
import type { Application } from '@prisma/client';

@Controller('events')
@UseGuards(ApiKeyGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  list(
    @CurrentApplication() application: Application,
    @Query(new ZodValidationPipe(ListEventsQuerySchema)) query: ListEventsQuery,
  ) {
    return this.eventsService.list(application.id, query);
  }

  @Get(':id')
  findOne(
    @CurrentApplication() application: Application,
    @Param('id') id: string,
  ) {
    return this.eventsService.findOne(application.id, id);
  }

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
