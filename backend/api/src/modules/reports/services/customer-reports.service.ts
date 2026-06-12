import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { ReportFilterDto } from '../dto/report-filter.dto';
import { ReportQueryService } from './report-query.service';

@Injectable()
export class CustomerReportsService {
  constructor(private readonly reports: ReportQueryService) {}
  top(filter: ReportFilterDto, user: AuthenticatedUser) { return this.reports.customers(filter, user, 'TOP'); }
  newCustomers(filter: ReportFilterDto, user: AuthenticatedUser) { return this.reports.customers(filter, user, 'NEW'); }
  repeat(filter: ReportFilterDto, user: AuthenticatedUser) { return this.reports.customers(filter, user, 'REPEAT'); }
}
