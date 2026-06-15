import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { auditRequestMetadata } from '../../audit/services/audit-request.util';
import {
  AssignDeviceToTerminalDto,
  CreateTerminalDto,
  DeviceAssignmentQueryDto,
  EndDeviceAssignmentDto,
  TerminalQueryDto,
  TenantDeviceQueryDto,
  UpdateTerminalDto,
} from '../dto/device.dto';
import { TerminalsService } from '../services/terminals.service';

@ApiTags('Terminals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class TerminalsController {
  constructor(private readonly terminals: TerminalsService) {}

  @Post('terminals')
  @ApiOperation({ summary: 'Create an outlet terminal' })
  @ApiCreatedResponse()
  create(
    @Body() dto: CreateTerminalDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.terminals.create(dto, actor, auditRequestMetadata(request));
  }

  @Get('terminals')
  @ApiOperation({ summary: 'List terminals' })
  @ApiOkResponse()
  list(@Query() query: TerminalQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.terminals.list(query, actor);
  }

  @Get('terminals/:id')
  @ApiOperation({ summary: 'Get terminal detail' })
  @ApiOkResponse()
  detail(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: TenantDeviceQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.terminals.detail(id, query, actor);
  }

  @Patch('terminals/:id')
  @ApiOperation({ summary: 'Update terminal metadata or status' })
  @ApiOkResponse()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTerminalDto,
    @Query() query: TenantDeviceQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.terminals.update(id, dto, query, actor, auditRequestMetadata(request));
  }

  @Post('terminals/:id/device-assignments')
  @ApiOperation({ summary: 'Assign a device to a terminal' })
  @ApiCreatedResponse()
  assignDevice(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignDeviceToTerminalDto,
    @Query() query: TenantDeviceQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.terminals.assignDevice(id, dto, query, actor, auditRequestMetadata(request));
  }

  @Get('terminals/:id/device-assignments')
  @ApiOperation({ summary: 'List device assignments for a terminal' })
  @ApiOkResponse()
  listAssignmentsForTerminal(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: DeviceAssignmentQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.terminals.listAssignmentsForTerminal(id, query, actor);
  }

  @Get('device-assignments')
  @ApiOperation({ summary: 'List device assignments' })
  @ApiOkResponse()
  listAssignments(
    @Query() query: DeviceAssignmentQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.terminals.listAssignments(query, actor);
  }

  @Patch('device-assignments/:id/end')
  @ApiOperation({ summary: 'End a device assignment' })
  @ApiOkResponse()
  endAssignment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EndDeviceAssignmentDto,
    @Query() query: TenantDeviceQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.terminals.endAssignment(id, dto, query, actor, auditRequestMetadata(request));
  }
}
