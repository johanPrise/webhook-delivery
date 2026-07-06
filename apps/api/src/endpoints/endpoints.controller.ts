import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CreateEndpointSchema,
  UpdateEndpointSchema,
  type CreateEndpointInput,
  type UpdateEndpointInput,
} from '@webhook/shared';
import type { Application } from '@prisma/client';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { CurrentApplication } from '../auth/current-application.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { EndpointsService } from './endpoints.service';

@Controller('endpoints')
@UseGuards(ApiKeyGuard)
export class EndpointsController {
  constructor(private readonly endpointsService: EndpointsService) {}

  @Get()
  list(@CurrentApplication() application: Application) {
    return this.endpointsService.list(application.id);
  }

  @Get(':id')
  findOne(
    @CurrentApplication() application: Application,
    @Param('id') id: string,
  ) {
    return this.endpointsService.findOne(application.id, id);
  }

  @Post()
  create(
    @CurrentApplication() application: Application,
    @Body(new ZodValidationPipe(CreateEndpointSchema))
    body: CreateEndpointInput,
  ) {
    return this.endpointsService.create(application.id, body);
  }

  @Patch(':id')
  update(
    @CurrentApplication() application: Application,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateEndpointSchema))
    body: UpdateEndpointInput,
  ) {
    return this.endpointsService.update(application.id, id, body);
  }
}
