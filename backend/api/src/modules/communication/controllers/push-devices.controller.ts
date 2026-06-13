import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { auditRequestMetadata } from '../../audit/services/audit-request.util';
import { RegisterPushDeviceDto } from '../dto/push-device.dto';
import { PushDevicesService } from '../services/push-devices.service';

@ApiTags('Communication Push Devices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('communication/push/devices')
export class PushDevicesController {
  constructor(private readonly devices: PushDevicesService) {}

  @Get()
  list(@CurrentUser() actor: AuthenticatedUser) {
    return this.devices.list(actor);
  }

  @Post()
  register(
    @Body() dto: RegisterPushDeviceDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.devices.register(dto, actor, auditRequestMetadata(request));
  }

  @Delete(':id')
  unregister(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.devices.unregister(id, actor, auditRequestMetadata(request));
  }
}
