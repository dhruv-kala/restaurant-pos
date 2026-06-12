import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import {
  CreateProductionRecipeDto,
  UpdateProductionRecipeDto,
} from '../dto/create-production-recipe.dto';
import { RecipeQueryDto } from '../dto/recipe-query.dto';
import { ProductionRecipesService } from '../services/production-recipes.service';

@ApiTags('production-recipes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('production-recipes')
export class ProductionRecipesController {
  constructor(private readonly recipes: ProductionRecipesService) {}

  @Post()
  create(
    @Body() dto: CreateProductionRecipeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.recipes.create(dto, user);
  }

  @Get()
  list(@Query() query: RecipeQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.recipes.findAll(query, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductionRecipeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.recipes.update(id, dto, user);
  }
}
