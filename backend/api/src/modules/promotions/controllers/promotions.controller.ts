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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { auditRequestMetadata } from '../../audit/services/audit-request.util';
import { ApplyManualDiscountDto, CalculateDiscountDto } from '../dto/discount-calculation.dto';
import {
  CreateDiscountPolicyDto,
  DiscountPolicyQueryDto,
  UpdateDiscountPolicyDto,
} from '../dto/discount-policy.dto';
import { DiscountPoliciesService } from '../services/discount-policies.service';

@ApiTags('Promotions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly discountPolicies: DiscountPoliciesService) {}

  @Post('discount-policies')
  @ApiOperation({ summary: 'Create a tenant-scoped discount policy' })
  createPolicy(
    @Body() dto: CreateDiscountPolicyDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.discountPolicies.create(dto, actor, auditRequestMetadata(request));
  }

  @Get('discount-policies')
  @ApiOperation({ summary: 'List discount policies' })
  listPolicies(@Query() query: DiscountPolicyQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.discountPolicies.list(query, actor);
  }

  @Get('discount-policies/:id')
  @ApiOperation({ summary: 'Get a discount policy' })
  detailPolicy(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: DiscountPolicyQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.discountPolicies.detail(id, query, actor);
  }

  @Patch('discount-policies/:id')
  @ApiOperation({ summary: 'Update a discount policy with optimistic concurrency' })
  updatePolicy(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDiscountPolicyDto,
    @Query() query: DiscountPolicyQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.discountPolicies.update(id, dto, query, actor, auditRequestMetadata(request));
  }

  @Post('discounts/calculate')
  @ApiOperation({ summary: 'Calculate a deterministic discount result' })
  calculateDiscount(@Body() dto: CalculateDiscountDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.discountPolicies.calculate(dto, actor);
  }

  @Post('discounts/apply-manual')
  @ApiOperation({ summary: 'Store an immutable manual discount application snapshot' })
  applyManualDiscount(
    @Body() dto: ApplyManualDiscountDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.discountPolicies.applyManual(dto, actor, auditRequestMetadata(request));
  }
}
