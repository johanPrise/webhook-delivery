import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { RequestWithApplication } from './api-key.guard';

export const CurrentApplication = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithApplication>();
    return request.application;
  },
);
