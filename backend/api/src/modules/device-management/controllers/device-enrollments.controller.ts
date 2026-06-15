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
  ActivateDeviceEnrollmentDto,
  ApproveDeviceEnrollmentDto,
  DeviceEnrollmentQueryDto,
  RequestDeviceEnrollmentDto,
  TenantDeviceQueryDto,
} from '../dto/device.dto';
import { DeviceEnrollmentsService } from '../services/device-enrollments.service';

@ApiTags('Device Enrollments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class DeviceEnrollmentsController {
  constructor(private readonly enrollments: DeviceEnrollmentsService) {}

  @Post('devices/:id/enrollments')
  @ApiOperation({ summary: 'Request enrollment for a registered device' })
  @ApiCreatedResponse()
  request(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RequestDeviceEnrollmentDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.enrollments.request(id, dto, actor, auditRequestMetadata(request));
  }

  @Get('devices/:id/enrollments')
  @ApiOperation({ summary: 'List enrollment history for a device' })
  @ApiOkResponse()
  listForDevice(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: DeviceEnrollmentQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.enrollments.listForDevice(id, query, actor);
  }

  @Get('device-enrollments/:id')
  @ApiOperation({ summary: 'Get a device enrollment record' })
  @ApiOkResponse()
  detail(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: TenantDeviceQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.enrollments.detail(id, query, actor);
  }

  @Patch('device-enrollments/:id/approve')
  @ApiOperation({ summary: 'Approve a requested device enrollment' })
  @ApiOkResponse()
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveDeviceEnrollmentDto,
    @Query() query: TenantDeviceQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.enrollments.approve(id, dto, query, actor, auditRequestMetadata(request));
  }

  @Post('device-enrollments/activate')
  @ApiOperation({ summary: 'Activate a device with an approved activation code' })
  @ApiOkResponse()
  activate(
    @Body() dto: ActivateDeviceEnrollmentDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.enrollments.activate(dto, actor, auditRequestMetadata(request));
  }
}
