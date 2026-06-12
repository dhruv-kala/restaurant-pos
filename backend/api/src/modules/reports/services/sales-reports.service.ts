import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { ReportFilterDto } from '../dto/report-filter.dto';
import { ReportQueryService } from './report-query.service';

@Injectable()
export class SalesReportsService {
  constructor(private readonly reports: ReportQueryService) {}
  summary(filter: ReportFilterDto, user: AuthenticatedUser) { return this.reports.salesSummary(filter, user); }
  daily(filter: ReportFilterDto, user: AuthenticatedUser) { return this.reports.salesTrend(filter, user, 'DAY'); }
  monthly(filter: ReportFilterDto, user: AuthenticatedUser) { return this.reports.salesTrend(filter, user, 'MONTH'); }
  yearly(filter: ReportFilterDto, user: AuthenticatedUser) { return this.reports.salesTrend(filter, user, 'YEAR'); }
  items(filter: ReportFilterDto, user: AuthenticatedUser) { return this.reports.itemSales(filter, user); }
  categories(filter: ReportFilterDto, user: AuthenticatedUser) { return this.reports.categorySales(filter, user); }
}
