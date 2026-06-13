import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
  ActivateTenantSubscriptionDto,
  ChangeTenantSubscriptionPlanDto,
  ChangeTenantSubscriptionStatusDto,
  TenantSubscriptionHistoryQueryDto,
  TenantSubscriptionQueryDto,
} from '../dto/tenant-subscription.dto';
import { TenantSubscriptionsService } from '../services/tenant-subscriptions.service';

@ApiTags('Tenant Subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('subscriptions/tenants')
export class TenantSubscriptionsController {
  constructor(private readonly subscriptions: TenantSubscriptionsService) {}

  @Post(':tenantId/activate')
  @ApiOperation({ summary: 'Activate a subscription for a tenant' })
  @ApiCreatedResponse()
  activate(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() dto: ActivateTenantSubscriptionDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.subscriptions.activate(tenantId, dto, actor, auditRequestMetadata(request));
  }

  @Get(':tenantId')
  @ApiOperation({ summary: 'List tenant subscription records' })
  @ApiOkResponse()
  list(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Query() query: TenantSubscriptionQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.subscriptions.list(tenantId, query, actor);
  }

  @Get(':tenantId/current')
  @ApiOperation({ summary: 'Get the current tenant subscription' })
  @ApiOkResponse()
  current(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.subscriptions.current(tenantId, actor);
  }

  @Get(':tenantId/history')
  @ApiOperation({ summary: 'List immutable tenant subscription history' })
  @ApiOkResponse()
  history(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Query() query: TenantSubscriptionHistoryQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.subscriptions.history(tenantId, query, actor);
  }

  @Get(':tenantId/subscriptions/:id')
  @ApiOperation({ summary: 'Get one tenant subscription record' })
  @ApiOkResponse()
  detail(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.subscriptions.detail(tenantId, id, actor);
  }

  @Post(':tenantId/subscriptions/:id/upgrade')
  @ApiOperation({ summary: 'Upgrade a tenant subscription plan version' })
  @ApiOkResponse()
  upgrade(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeTenantSubscriptionPlanDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.subscriptions.upgrade(tenantId, id, dto, actor, auditRequestMetadata(request));
  }

  @Post(':tenantId/subscriptions/:id/downgrade')
  @ApiOperation({ summary: 'Downgrade a tenant subscription plan version' })
  @ApiOkResponse()
  downgrade(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeTenantSubscriptionPlanDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.subscriptions.downgrade(tenantId, id, dto, actor, auditRequestMetadata(request));
  }

  @Post(':tenantId/subscriptions/:id/suspend')
  @ApiOperation({ summary: 'Suspend an active tenant subscription' })
  @ApiOkResponse()
  suspend(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeTenantSubscriptionStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.subscriptions.suspend(tenantId, id, dto, actor, auditRequestMetadata(request));
  }

  @Post(':tenantId/subscriptions/:id/resume')
  @ApiOperation({ summary: 'Resume a suspended tenant subscription' })
  @ApiOkResponse()
  resume(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeTenantSubscriptionStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.subscriptions.resume(tenantId, id, dto, actor, auditRequestMetadata(request));
  }

  @Post(':tenantId/subscriptions/:id/expire')
  @ApiOperation({ summary: 'Expire a tenant subscription' })
  @ApiOkResponse()
  expire(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeTenantSubscriptionStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.subscriptions.expire(tenantId, id, dto, actor, auditRequestMetadata(request));
  }

  @Post(':tenantId/subscriptions/:id/cancel')
  @ApiOperation({ summary: 'Cancel a tenant subscription' })
  @ApiOkResponse()
  cancel(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeTenantSubscriptionStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.subscriptions.cancel(tenantId, id, dto, actor, auditRequestMetadata(request));
  }
}
