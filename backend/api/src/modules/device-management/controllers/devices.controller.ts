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
  DeviceQueryDto,
  RegisterDeviceDto,
  TenantDeviceQueryDto,
  UpdateDeviceStatusDto,
} from '../dto/device.dto';
import { DevicesService } from '../services/devices.service';

@ApiTags('Devices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('devices')
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  @Post()
  @ApiOperation({ summary: 'Register a tenant device' })
  @ApiCreatedResponse()
  register(
    @Body() dto: RegisterDeviceDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.devices.register(dto, actor, auditRequestMetadata(request));
  }

  @Get()
  @ApiOperation({ summary: 'List tenant devices' })
  @ApiOkResponse()
  list(@Query() query: DeviceQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.devices.list(query, actor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a registered device' })
  @ApiOkResponse()
  detail(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: TenantDeviceQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.devices.detail(id, query, actor);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update a registered device status' })
  @ApiOkResponse()
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeviceStatusDto,
    @Query() query: TenantDeviceQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.devices.updateStatus(id, dto, query, actor, auditRequestMetadata(request));
  }
}
