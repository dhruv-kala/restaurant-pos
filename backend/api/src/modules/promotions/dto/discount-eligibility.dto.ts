import { CustomerType, PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class DiscountEligibilityItemDto {
  @IsOptional()
  @IsUUID('all')
  menuItemId?: string;

  @IsOptional()
  @IsUUID('all')
  categoryId?: string;

  @IsInt()
  @Min(1)
  @Max(10_000)
  quantity!: number;

  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  unitPriceMinor!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  lineTotalMinor?: number;
}

export class EvaluateDiscountEligibilityDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsOptional()
  @IsUUID('all')
  outletId?: string;

  @IsOptional()
  @IsUUID('all')
  customerId?: string;

  @IsOptional()
  @IsUUID('all')
  orderId?: string;

  @IsOptional()
  @IsUUID('all')
  billId?: string;

  @IsOptional()
  @IsDateString()
  businessDate?: string;

  @IsOptional()
  @IsDateString()
  evaluatedAt?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsEnum(CustomerType)
  customerType?: CustomerType;

  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  subtotalMinor!: number;

  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currencyCode!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  couponCodes?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('all', { each: true })
  discountPolicyIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('all', { each: true })
  campaignIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => DiscountEligibilityItemDto)
  items?: DiscountEligibilityItemDto[] = [];
}
