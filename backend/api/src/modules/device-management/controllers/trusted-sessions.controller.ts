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
  CreateTrustedSessionDto,
  RenewTrustedSessionDto,
  RevokeTrustedSessionDto,
  TenantDeviceQueryDto,
  TrustedSessionQueryDto,
} from '../dto/device.dto';
import { TrustedSessionsService } from '../services/trusted-sessions.service';

@ApiTags('Trusted Device Sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class TrustedSessionsController {
  constructor(private readonly sessions: TrustedSessionsService) {}

  @Post('devices/:id/trusted-sessions')
  @ApiOperation({ summary: 'Create a trusted session for an active device' })
  @ApiCreatedResponse()
  create(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTrustedSessionDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.sessions.create(id, dto, actor, auditRequestMetadata(request));
  }

  @Get('devices/:id/trusted-sessions')
  @ApiOperation({ summary: 'List trusted sessions for a device' })
  @ApiOkResponse()
  listForDevice(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: TrustedSessionQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.sessions.listForDevice(id, query, actor);
  }

  @Get('trusted-sessions')
  @ApiOperation({ summary: 'List trusted sessions' })
  @ApiOkResponse()
  list(@Query() query: TrustedSessionQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.sessions.list(query, actor);
  }

  @Get('trusted-sessions/:id')
  @ApiOperation({ summary: 'Get a trusted session' })
  @ApiOkResponse()
  detail(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: TenantDeviceQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.sessions.detail(id, query, actor);
  }

  @Patch('trusted-sessions/:id/renew')
  @ApiOperation({ summary: 'Renew a trusted session' })
  @ApiOkResponse()
  renew(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RenewTrustedSessionDto,
    @Query() query: TenantDeviceQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.sessions.renew(id, dto, query, actor, auditRequestMetadata(request));
  }

  @Patch('trusted-sessions/:id/revoke')
  @ApiOperation({ summary: 'Revoke a trusted session' })
  @ApiOkResponse()
  revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RevokeTrustedSessionDto,
    @Query() query: TenantDeviceQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.sessions.revoke(id, dto, query, actor, auditRequestMetadata(request));
  }
}
