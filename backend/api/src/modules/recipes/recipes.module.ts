import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { InventoryModule } from '../inventory/inventory.module';
import {
  ConsumptionController,
  WastageController,
} from './controllers/consumption.controller';
import { ProductionRecipesController } from './controllers/production-recipes.controller';
import { RecipesController } from './controllers/recipes.controller';
import { ConsumptionService } from './services/consumption.service';
import { CostingService } from './services/costing.service';
import { ProductionRecipesService } from './services/production-recipes.service';
import { RecipeEventsService } from './services/recipe-events.service';
import { RecipesService } from './services/recipes.service';

@Module({
  imports: [PrismaModule, InventoryModule],
  controllers: [
    RecipesController,
    ProductionRecipesController,
    ConsumptionController,
    WastageController,
  ],
  providers: [
    RecipesService,
    CostingService,
    ProductionRecipesService,
    ConsumptionService,
    RecipeEventsService,
  ],
  exports: [ConsumptionService],
})
export class RecipesModule {}
