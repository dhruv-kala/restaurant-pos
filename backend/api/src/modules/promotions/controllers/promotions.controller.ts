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
import {
  CouponQueryDto,
  CreateCouponDto,
  UpdateCouponDto,
  ValidateCouponDto,
} from '../dto/coupon.dto';
import { ApplyManualDiscountDto, CalculateDiscountDto } from '../dto/discount-calculation.dto';
import {
  CreateDiscountPolicyDto,
  DiscountPolicyQueryDto,
  UpdateDiscountPolicyDto,
} from '../dto/discount-policy.dto';
import { DiscountPoliciesService } from '../services/discount-policies.service';
import { CouponsService } from '../services/coupons.service';

@ApiTags('Promotions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('promotions')
export class PromotionsController {
  constructor(
    private readonly discountPolicies: DiscountPoliciesService,
    private readonly coupons: CouponsService,
  ) {}

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

  @Post('coupons')
  @ApiOperation({ summary: 'Create a tenant-scoped coupon definition' })
  createCoupon(
    @Body() dto: CreateCouponDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.coupons.create(dto, actor, auditRequestMetadata(request));
  }

  @Get('coupons')
  @ApiOperation({ summary: 'List coupon definitions' })
  listCoupons(@Query() query: CouponQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.coupons.list(query, actor);
  }

  @Get('coupons/:id')
  @ApiOperation({ summary: 'Get a coupon definition' })
  detailCoupon(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: CouponQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.coupons.detail(id, query, actor);
  }

  @Patch('coupons/:id')
  @ApiOperation({ summary: 'Update a coupon definition with optimistic concurrency' })
  updateCoupon(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCouponDto,
    @Query() query: CouponQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.coupons.update(id, dto, query, actor, auditRequestMetadata(request));
  }

  @Post('coupons/validate')
  @ApiOperation({ summary: 'Validate a coupon without creating redemption records' })
  validateCoupon(
    @Body() dto: ValidateCouponDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.coupons.validate(dto, actor, auditRequestMetadata(request));
  }
}
