import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { ReportFilterDto } from '../dto/report-filter.dto';
import { ReportQueryService } from './report-query.service';

@Injectable()
export class PaymentReportsService {
  constructor(private readonly reports: ReportQueryService) {}
  summary(filter: ReportFilterDto, user: AuthenticatedUser) { return this.reports.payments(filter, user, 'SUMMARY'); }
  methods(filter: ReportFilterDto, user: AuthenticatedUser) { return this.reports.payments(filter, user, 'METHODS'); }
  refunds(filter: ReportFilterDto, user: AuthenticatedUser) { return this.reports.payments(filter, user, 'REFUNDS'); }
}
