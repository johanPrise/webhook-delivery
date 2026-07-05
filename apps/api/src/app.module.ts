import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';
import { EventsModule } from './events/events.module';

@Module({
  imports: [PrismaModule, QueueModule, EventsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
