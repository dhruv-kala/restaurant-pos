import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ReservationsController } from './controllers/reservations.controller';
import { TableSectionsController } from './controllers/table-sections.controller';
import { TablesController } from './controllers/tables.controller';
import { ReservationsService } from './services/reservations.service';
import { TableSectionsService } from './services/table-sections.service';
import { TablesService } from './services/tables.service';

@Module({
  imports: [PrismaModule],
  controllers: [TableSectionsController, TablesController, ReservationsController],
  providers: [TableSectionsService, TablesService, ReservationsService],
  exports: [TableSectionsService, TablesService, ReservationsService],
})
export class TablesModule {}
