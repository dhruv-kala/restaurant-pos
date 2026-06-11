import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { KitchenModule } from '../kitchen/kitchen.module';
import { OrdersController } from './controllers/orders.controller';
import { OrderEventsService } from './services/order-events.service';
import { OrdersService } from './services/orders.service';

@Module({
  imports: [PrismaModule, KitchenModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderEventsService],
  exports: [OrdersService],
})
export class OrdersModule {}
