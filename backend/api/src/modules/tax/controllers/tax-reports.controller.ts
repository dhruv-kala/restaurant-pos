import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { TaxReportQueryDto } from '../dto/tax-report.dto';
import { TaxReportsService } from '../services/tax-reports.service';

@ApiTags('Tax Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tax/reports')
export class TaxReportsController {
  constructor(private readonly taxReports: TaxReportsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get tax summary totals from bill tax snapshots' })
  @ApiOkResponse()
  summary(@Query() query: TaxReportQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.taxReports.summary(query, actor);
  }

  @Get('detailed')
  @ApiOperation({ summary: 'Get invoice-level tax detail from bill tax snapshots' })
  @ApiOkResponse()
  detailed(@Query() query: TaxReportQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.taxReports.detailed(query, actor);
  }
}
