import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { hashApiKey } from './api-key.util';
import type { Application } from '@prisma/client';

export interface RequestWithApplication extends Request {
  application: Application;
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithApplication>();
    const apiKey = request.header('x-api-key');

    if (!apiKey) {
      throw new UnauthorizedException('Missing X-Api-Key header');
    }

    const application = await this.prisma.application.findUnique({
      where: { apiKeyHash: hashApiKey(apiKey) },
    });

    if (!application) {
      throw new UnauthorizedException('Invalid API key');
    }

    request.application = application;
    return true;
  }
}
