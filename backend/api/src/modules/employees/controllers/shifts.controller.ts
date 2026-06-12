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
import { AssignShiftDto } from '../dto/assign-shift.dto';
import { CreateShiftDto, UpdateShiftDto } from '../dto/create-shift.dto';
import { EmployeeQueryDto } from '../dto/employee-query.dto';
import { ShiftsService } from '../services/shifts.service';

@ApiTags('Employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shifts: ShiftsService) {}
  @Post() @ApiCreatedResponse()
  create(@Body() dto: CreateShiftDto, @CurrentUser() user: AuthenticatedUser) {
    return this.shifts.create(dto, user);
  }
  @Get() @ApiOkResponse()
  list(@Query() query: EmployeeQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.shifts.list(query, user);
  }
  @Patch(':id') @ApiOkResponse()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateShiftDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.shifts.update(id, dto, user);
  }
  @Delete(':id') @ApiOkResponse()
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.shifts.remove(id, user);
  }
  @Post('assign') @ApiCreatedResponse()
  assign(@Body() dto: AssignShiftDto, @CurrentUser() user: AuthenticatedUser) {
    return this.shifts.assign(dto, user);
  }
}
