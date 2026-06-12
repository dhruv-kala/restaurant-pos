import { Module } from '@nestjs/common';
import { CustomerReportsController } from './controllers/customer-reports.controller';
import { DashboardController } from './controllers/dashboard.controller';
import { GstReportsController } from './controllers/gst-reports.controller';
import { InventoryReportsController } from './controllers/inventory-reports.controller';
import { OutletReportsController } from './controllers/outlet-reports.controller';
import { PaymentReportsController } from './controllers/payment-reports.controller';
import { SalesReportsController } from './controllers/sales-reports.controller';
import { CustomerReportsService } from './services/customer-reports.service';
import { DashboardService } from './services/dashboard.service';
import { GstReportsService } from './services/gst-reports.service';
import { InventoryReportsService } from './services/inventory-reports.service';
import { OutletReportsService } from './services/outlet-reports.service';
import { PaymentReportsService } from './services/payment-reports.service';
import { ReportQueryService } from './services/report-query.service';
import { SalesReportsService } from './services/sales-reports.service';

@Module({
  controllers: [
    SalesReportsController,
    GstReportsController,
    PaymentReportsController,
    InventoryReportsController,
    CustomerReportsController,
    OutletReportsController,
    DashboardController,
  ],
  providers: [
    ReportQueryService,
    SalesReportsService,
    GstReportsService,
    PaymentReportsService,
    InventoryReportsService,
    CustomerReportsService,
    OutletReportsService,
    DashboardService,
  ],
})
export class ReportsModule {}
