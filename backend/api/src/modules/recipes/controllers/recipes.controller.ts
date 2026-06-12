import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { CreateRecipeIngredientDto, CreateRecipeDto } from '../dto/create-recipe.dto';
import { RecipeQueryDto } from '../dto/recipe-query.dto';
import { UpdateRecipeDto, UpdateRecipeIngredientDto } from '../dto/update-recipe.dto';
import { CostingService } from '../services/costing.service';
import { RecipesService } from '../services/recipes.service';

@ApiTags('recipes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('recipes')
export class RecipesController {
  constructor(
    private readonly recipes: RecipesService,
    private readonly costing: CostingService,
  ) {}

  @Post()
  create(@Body() dto: CreateRecipeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.recipes.create(dto, user);
  }

  @Get()
  list(@Query() query: RecipeQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.recipes.findAll(query, user);
  }

  @Get('profitability')
  profitability(@Query() query: RecipeQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.costing.profitability(query, user);
  }

  @Get(':id/cost')
  cost(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.costing.calculate(id, user);
  }

  @Get(':id/ingredients')
  ingredients(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.recipes.ingredients(id, user);
  }

  @Patch('ingredients/:ingredientId')
  updateIngredientById(
    @Param('ingredientId') ingredientId: string,
    @Body() dto: UpdateRecipeIngredientDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.recipes.updateIngredient(ingredientId, dto, user);
  }

  @Delete('ingredients/:ingredientId')
  deleteIngredientById(
    @Param('ingredientId') ingredientId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.recipes.removeIngredient(ingredientId, user);
  }

  @Post(':id/ingredients')
  addIngredient(
    @Param('id') id: string,
    @Body() dto: CreateRecipeIngredientDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.recipes.addIngredient(id, dto, user);
  }

  @Patch(':id/ingredients/:ingredientId')
  updateIngredient(
    @Param('id') id: string,
    @Param('ingredientId') ingredientId: string,
    @Body() dto: UpdateRecipeIngredientDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.recipes.updateIngredient(ingredientId, dto, user);
  }

  @Delete(':id/ingredients/:ingredientId')
  deleteIngredient(
    @Param('id') id: string,
    @Param('ingredientId') ingredientId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.recipes.removeIngredient(ingredientId, user);
  }

  @Get(':id')
  detail(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.recipes.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRecipeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.recipes.update(id, dto, user);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.recipes.remove(id, user);
  }
}
