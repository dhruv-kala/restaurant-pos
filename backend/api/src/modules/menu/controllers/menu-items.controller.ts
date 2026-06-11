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
import { CreateAddonDto } from '../dto/create-addon.dto';
import { CreateMenuItemDto } from '../dto/create-menu-item.dto';
import { CreateVariantDto } from '../dto/create-variant.dto';
import {
  MenuItemAddonResponseDto,
  MenuItemListResponseDto,
  MenuItemResponseDto,
  MenuItemVariantResponseDto,
} from '../dto/menu-response.dto';
import { MenuQueryDto } from '../dto/menu-query.dto';
import { UpdateMenuItemDto } from '../dto/update-menu-item.dto';
import { MenuItemsService } from '../services/menu-items.service';

@ApiTags('Menu')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('menu')
export class MenuItemsController {
  constructor(private readonly menuItemsService: MenuItemsService) {}

  @Post('items')
  @ApiCreatedResponse({ type: MenuItemResponseDto })
  create(
    @Body() dto: CreateMenuItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MenuItemResponseDto> {
    return this.menuItemsService.create(dto, user);
  }

  @Get('items')
  @ApiOkResponse({ type: MenuItemListResponseDto })
  findAll(
    @Query() query: MenuQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MenuItemListResponseDto> {
    return this.menuItemsService.findAll(query, user);
  }

  @Get('items/:id')
  @ApiOkResponse({ type: MenuItemResponseDto })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MenuItemResponseDto> {
    return this.menuItemsService.findOne(id, user);
  }

  @Patch('items/:id')
  @ApiOkResponse({ type: MenuItemResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMenuItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MenuItemResponseDto> {
    return this.menuItemsService.update(id, dto, user);
  }

  @Delete('items/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.menuItemsService.remove(id, user);
  }

  @Post('items/:id/variants')
  @ApiCreatedResponse({ type: MenuItemVariantResponseDto })
  createVariant(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateVariantDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MenuItemVariantResponseDto> {
    return this.menuItemsService.createVariant(id, dto, user);
  }

  @Get('items/:id/variants')
  @ApiOkResponse({ type: [MenuItemVariantResponseDto] })
  findVariants(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MenuItemVariantResponseDto[]> {
    return this.menuItemsService.findVariants(id, user);
  }

  @Delete('variants/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  removeVariant(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.menuItemsService.removeVariant(id, user);
  }

  @Post('items/:id/addons')
  @ApiCreatedResponse({ type: MenuItemAddonResponseDto })
  createAddon(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateAddonDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MenuItemAddonResponseDto> {
    return this.menuItemsService.createAddon(id, dto, user);
  }

  @Get('items/:id/addons')
  @ApiOkResponse({ type: [MenuItemAddonResponseDto] })
  findAddons(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MenuItemAddonResponseDto[]> {
    return this.menuItemsService.findAddons(id, user);
  }

  @Delete('addons/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  removeAddon(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.menuItemsService.removeAddon(id, user);
  }
}
