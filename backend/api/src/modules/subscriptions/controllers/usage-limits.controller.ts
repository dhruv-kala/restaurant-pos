import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { auditRequestMetadata } from '../../audit/services/audit-request.util';
import { AdjustUsageCounterDto } from '../dto/usage-limit.dto';
import { UsageLimitsService } from '../services/usage-limits.service';

@ApiTags('Subscription Usage Limits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('subscriptions/tenants/:tenantId/usage')
export class UsageLimitsController {
  constructor(private readonly usageLimits: UsageLimitsService) {}

  @Get()
  @ApiOperation({ summary: 'List persisted tenant usage counters' })
  @ApiOkResponse()
  list(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.usageLimits.list(tenantId, actor);
  }

  @Get(':featureKey')
  @ApiOperation({ summary: 'Evaluate the current usage limit for a feature' })
  @ApiOkResponse()
  evaluate(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('featureKey') featureKey: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.usageLimits.evaluate(tenantId, featureKey, actor);
  }

  @Post(':featureKey/adjust')
  @ApiOperation({ summary: 'Reconcile a tenant usage counter' })
  @ApiOkResponse()
  adjust(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('featureKey') featureKey: string,
    @Body() dto: AdjustUsageCounterDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.usageLimits.adjust(
      tenantId,
      featureKey,
      dto,
      actor,
      auditRequestMetadata(request),
    );
  }
}
