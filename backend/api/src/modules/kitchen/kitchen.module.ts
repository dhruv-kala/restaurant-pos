import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../prisma/prisma.module';
import { RecipesModule } from '../recipes/recipes.module';
import { EmployeesModule } from '../employees/employees.module';
import { KitchenStationsController } from './controllers/kitchen-stations.controller';
import { KitchenController } from './controllers/kitchen.controller';
import { KitchenGateway } from './gateways/kitchen.gateway';
import { KitchenEventsService } from './services/kitchen-events.service';
import { KitchenStationsService } from './services/kitchen-stations.service';
import { KitchenService } from './services/kitchen.service';

@Module({
  imports: [PrismaModule, JwtModule.register({}), RecipesModule, EmployeesModule],
  controllers: [KitchenController, KitchenStationsController],
  providers: [KitchenService, KitchenStationsService, KitchenGateway, KitchenEventsService],
  exports: [KitchenService, KitchenStationsService, KitchenEventsService],
})
export class KitchenModule {}
