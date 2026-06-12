import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { EmployeeQueryDto } from '../dto/employee-query.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { EmployeesService } from '../services/employees.service';
import { PerformanceService } from '../services/performance.service';

@ApiTags('Employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('employees')
export class EmployeesController {
  constructor(
    private readonly employees: EmployeesService,
    private readonly performance: PerformanceService,
  ) {}

  @Post() @ApiCreatedResponse()
  create(@Body() dto: CreateEmployeeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.employees.create(dto, user);
  }
  @Get() @ApiOkResponse()
  list(@Query() query: EmployeeQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.employees.list(query, user);
  }
  @Get('dashboard') @ApiOkResponse()
  dashboard(@Query() query: EmployeeQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.employees.dashboard(query, user);
  }
  @Get(':id/performance') @ApiOkResponse()
  employeePerformance(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: EmployeeQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.performance.employee(id, query, user);
  }
  @Get(':id') @ApiOkResponse()
  detail(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.employees.detail(id, user);
  }
  @Patch(':id') @ApiOkResponse()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.employees.update(id, dto, user);
  }
  @Delete(':id') @ApiOkResponse()
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.employees.remove(id, user);
  }
}
