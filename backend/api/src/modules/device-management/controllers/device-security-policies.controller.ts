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
  CreateDeviceSecurityPolicyDto,
  DeviceSecurityPolicyQueryDto,
  EvaluateDeviceSecurityPolicyQueryDto,
  TenantDeviceQueryDto,
  UpdateDeviceSecurityPolicyDto,
} from '../dto/device.dto';
import { DeviceSecurityPoliciesService } from '../services/device-security-policies.service';

@ApiTags('Device Security Policies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class DeviceSecurityPoliciesController {
  constructor(private readonly policies: DeviceSecurityPoliciesService) {}

  @Post('device-security-policies')
  @ApiOperation({ summary: 'Create a device security policy' })
  @ApiCreatedResponse()
  create(
    @Body() dto: CreateDeviceSecurityPolicyDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.policies.create(dto, actor, auditRequestMetadata(request));
  }

  @Get('device-security-policies')
  @ApiOperation({ summary: 'List device security policies' })
  @ApiOkResponse()
  list(@Query() query: DeviceSecurityPolicyQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.policies.list(query, actor);
  }

  @Get('device-security-policies/:id')
  @ApiOperation({ summary: 'Get device security policy detail' })
  @ApiOkResponse()
  detail(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: TenantDeviceQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.policies.detail(id, query, actor);
  }

  @Patch('device-security-policies/:id')
  @ApiOperation({ summary: 'Update a device security policy' })
  @ApiOkResponse()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeviceSecurityPolicyDto,
    @Query() query: TenantDeviceQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.policies.update(id, dto, query, actor, auditRequestMetadata(request));
  }

  @Get('devices/:id/security-policy')
  @ApiOperation({ summary: 'Evaluate effective security policy for a device' })
  @ApiOkResponse()
  evaluate(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: EvaluateDeviceSecurityPolicyQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.policies.evaluate(id, query, actor);
  }
}
