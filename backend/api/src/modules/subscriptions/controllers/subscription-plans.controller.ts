import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
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
  ChangeSubscriptionPlanStatusDto,
  CreateSubscriptionPlanDto,
  ReplaceSubscriptionPlanFeaturesDto,
  SubscriptionPlanQueryDto,
  UpdateSubscriptionPlanDto,
} from '../dto/subscription-plan.dto';
import { SubscriptionPlansService } from '../services/subscription-plans.service';

@ApiTags('Subscription Plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('subscriptions/plans')
export class SubscriptionPlansController {
  constructor(private readonly plans: SubscriptionPlansService) {}

  @Post()
  @ApiOperation({ summary: 'Create a draft subscription plan version' })
  @ApiCreatedResponse()
  create(
    @Body() dto: CreateSubscriptionPlanDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.plans.create(dto, actor, auditRequestMetadata(request));
  }

  @Get()
  @ApiOperation({ summary: 'List subscription plan versions' })
  @ApiOkResponse()
  list(@Query() query: SubscriptionPlanQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.plans.list(query, actor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a subscription plan version' })
  @ApiOkResponse()
  detail(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.plans.detail(id, actor);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'List every version for a subscription plan code' })
  @ApiOkResponse()
  versions(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.plans.versions(id, actor);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a draft plan or create the next draft version from an activated plan',
  })
  @ApiOkResponse()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubscriptionPlanDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.plans.update(id, dto, actor, auditRequestMetadata(request));
  }

  @Put(':id/features')
  @ApiOperation({ summary: 'Replace features on a draft subscription plan' })
  @ApiOkResponse()
  replaceFeatures(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplaceSubscriptionPlanFeaturesDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.plans.replaceFeatures(id, dto, actor, auditRequestMetadata(request));
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate a draft subscription plan version' })
  @ApiOkResponse()
  activate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeSubscriptionPlanStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.plans.activate(id, dto, actor, auditRequestMetadata(request));
  }

  @Post(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate an active subscription plan version' })
  @ApiOkResponse()
  deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeSubscriptionPlanStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.plans.deactivate(id, dto, actor, auditRequestMetadata(request));
  }
}
