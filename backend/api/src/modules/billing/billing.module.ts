import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { BillingController } from './controllers/billing.controller';
import { BillingEventsService } from './events/billing-events.service';
import { BillingService } from './services/billing.service';

@Module({
  imports: [PrismaModule],
  controllers: [BillingController],
  providers: [BillingService, BillingEventsService],
  exports: [BillingService],
})
export class BillingModule {}
