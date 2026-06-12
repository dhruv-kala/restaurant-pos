import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiAcceptedResponse, ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { ExportReportDto } from '../dto/export-report.dto';
import { ReportFilterDto } from '../dto/report-filter.dto';
import { OutletReportsService } from '../services/outlet-reports.service';

@ApiTags('Reports') @ApiBearerAuth() @UseGuards(JwtAuthGuard)
@Controller('reports')
export class OutletReportsController {
  constructor(private readonly reports: OutletReportsService) {}
  @Get('outlets/performance') @ApiOkResponse() performance(@Query() filter: ReportFilterDto, @CurrentUser() user: AuthenticatedUser) { return this.reports.performance(filter, user); }
  @Get('kitchen/performance') @ApiOkResponse() kitchen(@Query() filter: ReportFilterDto, @CurrentUser() user: AuthenticatedUser) { return this.reports.kitchen(filter, user); }
  @Get('staff/performance') @ApiOkResponse() staff(@Query() filter: ReportFilterDto, @CurrentUser() user: AuthenticatedUser) { return this.reports.staff(filter, user); }
  @Get('platform/summary') @ApiOkResponse() platform(@Query() filter: ReportFilterDto, @CurrentUser() user: AuthenticatedUser) { return this.reports.platform(filter, user); }
  @Post('export') @ApiAcceptedResponse() export(@Body() dto: ExportReportDto, @CurrentUser() user: AuthenticatedUser) { return this.reports.export(dto, user); }
}
