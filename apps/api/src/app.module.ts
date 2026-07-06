import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';
import { EventsModule } from './events/events.module';
import { EndpointsModule } from './endpoints/endpoints.module';
import { ApplicationModule } from './application/application.module';

@Module({
  imports: [
    PrismaModule,
    QueueModule,
    EventsModule,
    EndpointsModule,
    ApplicationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
