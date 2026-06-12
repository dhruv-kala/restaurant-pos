import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CustomersModule } from '../customers/customers.module';
import { PaymentsController } from './controllers/payments.controller';
import { PaymentEventsService } from './events/payment-events.service';
import { PaymentsService } from './services/payments.service';

@Module({
  imports: [PrismaModule, CustomersModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentEventsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
