import { PartialType } from '@nestjs/swagger';
import { CreateRecipeDto, CreateRecipeIngredientDto } from './create-recipe.dto';

export class UpdateRecipeDto extends PartialType(CreateRecipeDto) {}
export class UpdateRecipeIngredientDto extends PartialType(CreateRecipeIngredientDto) {}
