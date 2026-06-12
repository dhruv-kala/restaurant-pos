import { WastageReason } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class WastageDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsUUID('all')
  outletId!: string;

  @IsUUID('all')
  ingredientId!: string;

  @IsUUID('all')
  unitId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity!: number;

  @IsEnum(WastageReason)
  reason!: WastageReason;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
