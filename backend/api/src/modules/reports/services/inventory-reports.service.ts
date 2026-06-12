import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { ReportFilterDto } from '../dto/report-filter.dto';
import { ReportQueryService } from './report-query.service';

@Injectable()
export class InventoryReportsService {
  constructor(private readonly reports: ReportQueryService) {}
  value(filter: ReportFilterDto, user: AuthenticatedUser) { return this.reports.inventory(filter, user, 'VALUE'); }
  consumption(filter: ReportFilterDto, user: AuthenticatedUser) { return this.reports.inventory(filter, user, 'CONSUMPTION'); }
  wastage(filter: ReportFilterDto, user: AuthenticatedUser) { return this.reports.inventory(filter, user, 'WASTAGE'); }
  lowStock(filter: ReportFilterDto, user: AuthenticatedUser) { return this.reports.inventory(filter, user, 'LOW_STOCK'); }
}
