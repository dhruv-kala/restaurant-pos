import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { DashboardFilterDto } from '../dto/dashboard-filter.dto';
import { ReportQueryService } from './report-query.service';

@Injectable()
export class DashboardService {
  constructor(private readonly reports: ReportQueryService) {}

  async metrics(filter: DashboardFilterDto, user: AuthenticatedUser) {
    const businessDate = filter.businessDate ?? new Date();
    return this.reports.dashboard({ ...filter, businessDate }, user);
  }
}
