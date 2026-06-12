import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { CreateRecipeIngredientDto } from './create-recipe.dto';

export class CreateProductionRecipeDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsOptional()
  @IsUUID('all')
  outputIngredientId?: string;

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
  yieldQuantity!: number;

  @IsOptional()
  @IsBoolean()
  isActive = true;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRecipeIngredientDto)
  ingredients?: CreateRecipeIngredientDto[];
}

export class UpdateProductionRecipeDto extends PartialType(CreateProductionRecipeDto) {}
