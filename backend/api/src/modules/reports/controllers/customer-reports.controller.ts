import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { ReportFilterDto } from '../dto/report-filter.dto';
import { CustomerReportsService } from '../services/customer-reports.service';

@ApiTags('Reports') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('reports/customers')
export class CustomerReportsController {
  constructor(private readonly reports: CustomerReportsService) {}
  @Get('top') @ApiOkResponse() top(@Query() filter: ReportFilterDto, @CurrentUser() user: AuthenticatedUser) { return this.reports.top(filter, user); }
  @Get('new') @ApiOkResponse() newCustomers(@Query() filter: ReportFilterDto, @CurrentUser() user: AuthenticatedUser) { return this.reports.newCustomers(filter, user); }
  @Get('repeat') @ApiOkResponse() repeat(@Query() filter: ReportFilterDto, @CurrentUser() user: AuthenticatedUser) { return this.reports.repeat(filter, user); }
}
