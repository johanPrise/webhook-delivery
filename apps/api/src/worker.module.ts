import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { DeliveryModule } from './delivery/delivery.module';

@Module({
  imports: [PrismaModule, DeliveryModule],
})
export class WorkerModule {}
