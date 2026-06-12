import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import {
  CreateIngredientDto,
  CreateInventoryCategoryDto,
  CreateUnitOfMeasureDto,
} from '../dto/create-ingredient.dto';
import { InventoryQueryDto } from '../dto/inventory-query.dto';
import {
  UpdateIngredientDto,
  UpdateInventoryCategoryDto,
  UpdateUnitOfMeasureDto,
} from '../dto/update-ingredient.dto';
import { IngredientsService } from '../services/ingredients.service';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class IngredientsController {
  constructor(private readonly ingredients: IngredientsService) {}

  @Get('categories')
  @ApiOkResponse()
  categories(@Query() query: InventoryQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.ingredients.categories(query, user);
  }

  @Post('categories')
  @ApiCreatedResponse()
  createCategory(@Body() dto: CreateInventoryCategoryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.ingredients.createCategory(dto, user);
  }

  @Patch('categories/:id')
  @ApiOkResponse()
  updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInventoryCategoryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ingredients.updateCategory(id, dto, user);
  }

  @Get('units')
  @ApiOkResponse()
  units(@Query() query: InventoryQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.ingredients.units(query, user);
  }

  @Post('units')
  @ApiCreatedResponse()
  createUnit(@Body() dto: CreateUnitOfMeasureDto, @CurrentUser() user: AuthenticatedUser) {
    return this.ingredients.createUnit(dto, user);
  }

  @Patch('units/:id')
  @ApiOkResponse()
  updateUnit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUnitOfMeasureDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ingredients.updateUnit(id, dto, user);
  }

  @Post('ingredients')
  @ApiCreatedResponse()
  create(@Body() dto: CreateIngredientDto, @CurrentUser() user: AuthenticatedUser) {
    return this.ingredients.create(dto, user);
  }

  @Get('ingredients')
  @ApiOkResponse()
  findAll(@Query() query: InventoryQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.ingredients.findAll(query, user);
  }

  @Get('ingredients/:id')
  @ApiOkResponse()
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.ingredients.findOne(id, user);
  }

  @Patch('ingredients/:id')
  @ApiOkResponse()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIngredientDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ingredients.update(id, dto, user);
  }

  @Delete('ingredients/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.ingredients.remove(id, user);
  }
}
