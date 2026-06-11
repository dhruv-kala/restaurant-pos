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
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { CreateCategoryDto } from '../dto/create-category.dto';
import {
  MenuCategoryListResponseDto,
  MenuCategoryResponseDto,
} from '../dto/menu-response.dto';
import { MenuQueryDto } from '../dto/menu-query.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { CategoriesService } from '../services/categories.service';

@ApiTags('Menu')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('menu/categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ApiCreatedResponse({ type: MenuCategoryResponseDto })
  create(
    @Body() dto: CreateCategoryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MenuCategoryResponseDto> {
    return this.categoriesService.create(dto, user);
  }

  @Get()
  @ApiOkResponse({ type: MenuCategoryListResponseDto })
  findAll(
    @Query() query: MenuQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MenuCategoryListResponseDto> {
    return this.categoriesService.findAll(query, user);
  }

  @Get(':id')
  @ApiOkResponse({ type: MenuCategoryResponseDto })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MenuCategoryResponseDto> {
    return this.categoriesService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOkResponse({ type: MenuCategoryResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MenuCategoryResponseDto> {
    return this.categoriesService.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.categoriesService.remove(id, user);
  }
}
