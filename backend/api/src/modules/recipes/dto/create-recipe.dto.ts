import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateRecipeIngredientDto {
  @IsUUID('all')
  ingredientId!: string;

  @IsUUID('all')
  unitId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99.99)
  wastagePercentage = 0;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class CreateRecipeDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsUUID('all')
  menuItemId!: string;

  @IsOptional()
  @IsUUID('all')
  variantId?: string;

  @IsUUID('all')
  yieldUnitId!: string;

  @IsString()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  yieldQuantity = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  portionMultiplier = 1;

  @IsOptional()
  @IsBoolean()
  isActive = true;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRecipeIngredientDto)
  ingredients?: CreateRecipeIngredientDto[];
}
