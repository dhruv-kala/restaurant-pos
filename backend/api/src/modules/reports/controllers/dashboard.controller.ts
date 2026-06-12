import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { DashboardFilterDto } from '../dto/dashboard-filter.dto';
import { DashboardService } from '../services/dashboard.service';

@ApiTags('Reports') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}
  @Get() @ApiOkResponse() metrics(@Query() filter: DashboardFilterDto, @CurrentUser() user: AuthenticatedUser) { return this.dashboard.metrics(filter, user); }
}
