import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { ReportFilterDto } from '../dto/report-filter.dto';
import { PaymentReportsService } from '../services/payment-reports.service';

@ApiTags('Reports') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('reports/payments')
export class PaymentReportsController {
  constructor(private readonly reports: PaymentReportsService) {}
  @Get('summary') @ApiOkResponse() summary(@Query() filter: ReportFilterDto, @CurrentUser() user: AuthenticatedUser) { return this.reports.summary(filter, user); }
  @Get('methods') @ApiOkResponse() methods(@Query() filter: ReportFilterDto, @CurrentUser() user: AuthenticatedUser) { return this.reports.methods(filter, user); }
  @Get('refunds') @ApiOkResponse() refunds(@Query() filter: ReportFilterDto, @CurrentUser() user: AuthenticatedUser) { return this.reports.refunds(filter, user); }
}
