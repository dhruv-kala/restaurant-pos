import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { ExportReportDto } from '../dto/export-report.dto';
import type { ReportFilterDto } from '../dto/report-filter.dto';
import { ReportQueryService } from './report-query.service';

@Injectable()
export class OutletReportsService {
  constructor(private readonly reports: ReportQueryService) {}
  performance(filter: ReportFilterDto, user: AuthenticatedUser) { return this.reports.outletPerformance(filter, user); }
  kitchen(filter: ReportFilterDto, user: AuthenticatedUser) { return this.reports.kitchen(filter, user); }
  staff(filter: ReportFilterDto, user: AuthenticatedUser) { return this.reports.staff(filter, user); }
  platform(filter: ReportFilterDto, user: AuthenticatedUser) { return this.reports.platform(filter, user); }
  export(dto: ExportReportDto, user: AuthenticatedUser) { return this.reports.export(dto, user); }
}
