import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { ReportFilterDto } from '../dto/report-filter.dto';
import { GstReportsService } from '../services/gst-reports.service';

@ApiTags('Reports') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('reports/gst')
export class GstReportsController {
  constructor(private readonly reports: GstReportsService) {}
  @Get('summary') @ApiOkResponse() summary(@Query() filter: ReportFilterDto, @CurrentUser() user: AuthenticatedUser) { return this.reports.summary(filter, user); }
  @Get('detailed') @ApiOkResponse() detailed(@Query() filter: ReportFilterDto, @CurrentUser() user: AuthenticatedUser) { return this.reports.detailed(filter, user); }
}
