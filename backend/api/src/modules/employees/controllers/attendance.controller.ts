import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { AttendanceDto } from '../dto/attendance.dto';
import { EmployeeQueryDto } from '../dto/employee-query.dto';
import { AttendanceService } from '../services/attendance.service';

@ApiTags('Employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}
  @Post('check-in') @ApiCreatedResponse()
  checkIn(@Body() dto: AttendanceDto, @CurrentUser() user: AuthenticatedUser) {
    return this.attendance.checkIn(dto, user);
  }
  @Post('check-out') @ApiOkResponse()
  checkOut(@Body() dto: AttendanceDto, @CurrentUser() user: AuthenticatedUser) {
    return this.attendance.checkOut(dto, user);
  }
  @Get() @ApiOkResponse()
  list(@Query() query: EmployeeQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.attendance.list(query, user);
  }
  @Get(':employeeId') @ApiOkResponse()
  employee(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Query() query: EmployeeQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendance.list(query, user, employeeId);
  }
}
