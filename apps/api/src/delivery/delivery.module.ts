import { Module } from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { ReconciliationService } from './reconciliation.service';

@Module({
  providers: [DeliveryService, ReconciliationService],
  exports: [DeliveryService, ReconciliationService],
})
export class DeliveryModule {}
