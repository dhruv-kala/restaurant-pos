import { Module } from '@nestjs/common';
import { AlertsController } from './controllers/alerts.controller';
import { IngredientsController } from './controllers/ingredients.controller';
import { PurchaseOrdersController } from './controllers/purchase-orders.controller';
import { StockController } from './controllers/stock.controller';
import { VendorsController } from './controllers/vendors.controller';
import { AlertsService } from './services/alerts.service';
import { IngredientsService } from './services/ingredients.service';
import { InventoryEventsService } from './services/inventory-events.service';
import { PurchaseOrdersService } from './services/purchase-orders.service';
import { StockService } from './services/stock.service';
import { VendorsService } from './services/vendors.service';

@Module({
  controllers: [
    IngredientsController,
    StockController,
    VendorsController,
    PurchaseOrdersController,
    AlertsController,
  ],
  providers: [
    IngredientsService,
    StockService,
    VendorsService,
    PurchaseOrdersService,
    AlertsService,
    InventoryEventsService,
  ],
  exports: [IngredientsService, StockService, VendorsService, PurchaseOrdersService],
})
export class InventoryModule {}
