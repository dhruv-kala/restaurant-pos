import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CustomerAddressesController } from './controllers/customer-addresses.controller';
import { CustomerNotesController } from './controllers/customer-notes.controller';
import { CustomersController } from './controllers/customers.controller';
import { CustomerAddressesService } from './services/customer-addresses.service';
import { CustomerNotesService } from './services/customer-notes.service';
import { CustomerStatsService } from './services/customer-stats.service';
import { CustomersService } from './services/customers.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    CustomersController,
    CustomerAddressesController,
    CustomerNotesController,
  ],
  providers: [
    CustomersService,
    CustomerAddressesService,
    CustomerNotesService,
    CustomerStatsService,
  ],
  exports: [CustomerStatsService],
})
export class CustomersModule {}
