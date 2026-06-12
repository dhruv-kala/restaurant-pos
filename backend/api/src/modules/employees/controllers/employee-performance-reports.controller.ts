import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { EmployeeQueryDto } from '../dto/employee-query.dto';
import { PerformanceService } from '../services/performance.service';

@ApiTags('Employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports/employees')
export class EmployeePerformanceReportsController {
  constructor(private readonly performance: PerformanceService) {}
  @Get('performance') @ApiOkResponse()
  report(@Query() query: EmployeeQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.performance.report(query, user);
  }
}
