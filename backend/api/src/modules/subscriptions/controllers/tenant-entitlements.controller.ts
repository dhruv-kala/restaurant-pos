import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { auditRequestMetadata } from '../../audit/services/audit-request.util';
import {
  RevokeTenantEntitlementDto,
  UpsertTenantEntitlementDto,
} from '../dto/tenant-entitlement.dto';
import { TenantEntitlementsService } from '../services/tenant-entitlements.service';

@ApiTags('Tenant Entitlements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('subscriptions/tenants/:tenantId/entitlements')
export class TenantEntitlementsController {
  constructor(private readonly entitlements: TenantEntitlementsService) {}

  @Get()
  @ApiOperation({ summary: 'List effective tenant feature entitlements' })
  @ApiOkResponse()
  list(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.entitlements.list(tenantId, actor);
  }

  @Get(':featureKey')
  @ApiOperation({ summary: 'Evaluate one tenant feature entitlement' })
  @ApiOkResponse()
  evaluate(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('featureKey') featureKey: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.entitlements.evaluate(tenantId, featureKey, actor);
  }

  @Put(':featureKey')
  @ApiOperation({ summary: 'Create or replace a tenant feature override' })
  @ApiOkResponse()
  upsert(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('featureKey') featureKey: string,
    @Body() dto: UpsertTenantEntitlementDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.entitlements.upsert(
      tenantId,
      featureKey,
      dto,
      actor,
      auditRequestMetadata(request),
    );
  }

  @Post(':featureKey/revoke')
  @ApiOperation({ summary: 'Revoke a tenant feature override' })
  @ApiOkResponse()
  revoke(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('featureKey') featureKey: string,
    @Body() dto: RevokeTenantEntitlementDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.entitlements.revoke(
      tenantId,
      featureKey,
      dto,
      actor,
      auditRequestMetadata(request),
    );
  }
}
