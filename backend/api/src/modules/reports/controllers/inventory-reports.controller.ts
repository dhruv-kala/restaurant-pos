import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { ReportFilterDto } from '../dto/report-filter.dto';
import { InventoryReportsService } from '../services/inventory-reports.service';

@ApiTags('Reports') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('reports/inventory')
export class InventoryReportsController {
  constructor(private readonly reports: InventoryReportsService) {}
  @Get('value') @ApiOkResponse() value(@Query() filter: ReportFilterDto, @CurrentUser() user: AuthenticatedUser) { return this.reports.value(filter, user); }
  @Get('consumption') @ApiOkResponse() consumption(@Query() filter: ReportFilterDto, @CurrentUser() user: AuthenticatedUser) { return this.reports.consumption(filter, user); }
  @Get('wastage') @ApiOkResponse() wastage(@Query() filter: ReportFilterDto, @CurrentUser() user: AuthenticatedUser) { return this.reports.wastage(filter, user); }
  @Get('low-stock') @ApiOkResponse() lowStock(@Query() filter: ReportFilterDto, @CurrentUser() user: AuthenticatedUser) { return this.reports.lowStock(filter, user); }
}
