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
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { auditRequestMetadata } from '../../audit/services/audit-request.util';
import {
  ConvertTrialSubscriptionDto,
  ExpireDueTrialsDto,
  ExpireTrialSubscriptionDto,
  ExtendTrialSubscriptionDto,
  StartTrialSubscriptionDto,
  TrialSubscriptionHistoryQueryDto,
} from '../dto/trial-subscription.dto';
import { TrialSubscriptionsService } from '../services/trial-subscriptions.service';

@ApiTags('Trial Subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('subscriptions')
export class TrialSubscriptionsController {
  constructor(private readonly trials: TrialSubscriptionsService) {}

  @Post('tenants/:tenantId/trials/start')
  @ApiOperation({ summary: 'Start a tenant trial subscription' })
  @ApiOkResponse()
  start(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() dto: StartTrialSubscriptionDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.trials.start(tenantId, dto, actor, auditRequestMetadata(request));
  }

  @Get('tenants/:tenantId/trials')
  @ApiOperation({ summary: 'List tenant trial subscriptions' })
  @ApiOkResponse()
  list(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.trials.list(tenantId, actor);
  }

  @Get('tenants/:tenantId/trials/:id')
  @ApiOperation({ summary: 'Get one trial subscription' })
  @ApiOkResponse()
  detail(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.trials.detail(tenantId, id, actor);
  }

  @Get('tenants/:tenantId/trials/:id/history')
  @ApiOperation({ summary: 'List immutable trial lifecycle events' })
  @ApiOkResponse()
  history(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: TrialSubscriptionHistoryQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.trials.history(tenantId, id, query, actor);
  }

  @Post('tenants/:tenantId/trials/:id/extend')
  @ApiOperation({ summary: 'Extend an active trial subscription' })
  @ApiOkResponse()
  extend(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExtendTrialSubscriptionDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.trials.extend(tenantId, id, dto, actor, auditRequestMetadata(request));
  }

  @Post('tenants/:tenantId/trials/:id/expire')
  @ApiOperation({ summary: 'Expire an active trial subscription' })
  @ApiOkResponse()
  expire(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExpireTrialSubscriptionDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.trials.expire(tenantId, id, dto, actor, auditRequestMetadata(request));
  }

  @Post('tenants/:tenantId/trials/:id/convert')
  @ApiOperation({ summary: 'Convert an active trial to a paid subscription' })
  @ApiOkResponse()
  convert(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConvertTrialSubscriptionDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.trials.convert(tenantId, id, dto, actor, auditRequestMetadata(request));
  }

  @Post('trials/expire-due')
  @ApiOperation({ summary: 'Expire all due active trials' })
  @ApiOkResponse()
  expireDue(
    @Body() dto: ExpireDueTrialsDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.trials.expireDue(dto, actor, auditRequestMetadata(request));
  }
}
