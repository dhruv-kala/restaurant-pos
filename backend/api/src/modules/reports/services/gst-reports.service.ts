import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { ReportFilterDto } from '../dto/report-filter.dto';
import { ReportQueryService } from './report-query.service';

@Injectable()
export class GstReportsService {
  constructor(private readonly reports: ReportQueryService) {}
  summary(filter: ReportFilterDto, user: AuthenticatedUser) { return this.reports.gst(filter, user, false); }
  detailed(filter: ReportFilterDto, user: AuthenticatedUser) { return this.reports.gst(filter, user, true); }
}
