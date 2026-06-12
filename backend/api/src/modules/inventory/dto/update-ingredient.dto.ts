import { PartialType } from '@nestjs/swagger';
import {
  CreateIngredientDto,
  CreateInventoryCategoryDto,
  CreateUnitOfMeasureDto,
} from './create-ingredient.dto';

export class UpdateIngredientDto extends PartialType(CreateIngredientDto) {}
export class UpdateInventoryCategoryDto extends PartialType(CreateInventoryCategoryDto) {}
export class UpdateUnitOfMeasureDto extends PartialType(CreateUnitOfMeasureDto) {}
