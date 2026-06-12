import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { ReportFilterDto } from '../dto/report-filter.dto';
import { SalesReportsService } from '../services/sales-reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports/sales')
export class SalesReportsController {
  constructor(private readonly reports: SalesReportsService) {}
  @Get('summary') @ApiOkResponse() summary(@Query() filter: ReportFilterDto, @CurrentUser() user: AuthenticatedUser) { return this.reports.summary(filter, user); }
  @Get('daily') @ApiOkResponse() daily(@Query() filter: ReportFilterDto, @CurrentUser() user: AuthenticatedUser) { return this.reports.daily(filter, user); }
  @Get('monthly') @ApiOkResponse() monthly(@Query() filter: ReportFilterDto, @CurrentUser() user: AuthenticatedUser) { return this.reports.monthly(filter, user); }
  @Get('yearly') @ApiOkResponse() yearly(@Query() filter: ReportFilterDto, @CurrentUser() user: AuthenticatedUser) { return this.reports.yearly(filter, user); }
  @Get('items') @ApiOkResponse() items(@Query() filter: ReportFilterDto, @CurrentUser() user: AuthenticatedUser) { return this.reports.items(filter, user); }
  @Get('categories') @ApiOkResponse() categories(@Query() filter: ReportFilterDto, @CurrentUser() user: AuthenticatedUser) { return this.reports.categories(filter, user); }
}
