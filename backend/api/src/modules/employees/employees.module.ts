import { Module } from '@nestjs/common';
import { AttendanceController } from './controllers/attendance.controller';
import { EmployeePerformanceReportsController } from './controllers/employee-performance-reports.controller';
import { EmployeesController } from './controllers/employees.controller';
import { ShiftsController } from './controllers/shifts.controller';
import { AttendanceService } from './services/attendance.service';
import { EmployeeEventsService } from './services/employee-events.service';
import { EmployeesService } from './services/employees.service';
import { PerformanceService } from './services/performance.service';
import { ShiftsService } from './services/shifts.service';

@Module({
  controllers: [
    EmployeesController,
    ShiftsController,
    AttendanceController,
    EmployeePerformanceReportsController,
  ],
  providers: [
    EmployeesService,
    ShiftsService,
    AttendanceService,
    PerformanceService,
    EmployeeEventsService,
  ],
  exports: [PerformanceService],
})
export class EmployeesModule {}
