import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';
import { DeliveryModule } from './delivery/delivery.module';

@Module({
  imports: [PrismaModule, QueueModule, DeliveryModule],
})
export class WorkerModule {}
