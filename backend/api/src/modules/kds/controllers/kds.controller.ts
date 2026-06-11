import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { CreateKitchenCategoryDto, UpdateKitchenCategoryDto } from '../dto/kitchen-category.dto';
import { KitchenQueueQueryDto } from '../dto/kitchen-queue-query.dto';
import { StartItemDto } from '../dto/start-item.dto';
import { KdsService } from '../services/kds.service';

@ApiTags('KDS')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('kds')
export class KdsController {
  constructor(private readonly kds: KdsService) {}

  @Get('queue')
  @ApiOkResponse({ description: 'Filtered kitchen preparation queue.' })
  queue(@Query() query: KitchenQueueQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.kds.queue(query, user);
  }

  @Get('active')
  @ApiOkResponse({ description: 'Active kitchen orders.' })
  active(@Query() query: KitchenQueueQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.kds.active(query, user);
  }

  @Get('ready')
  @ApiOkResponse({ description: 'Ready kitchen orders.' })
  ready(@Query() query: KitchenQueueQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.kds.ready(query, user);
  }

  @Get('completed')
  @ApiOkResponse({ description: 'Served and completed kitchen orders.' })
  completed(@Query() query: KitchenQueueQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.kds.completed(query, user);
  }

  @Post('items/:id/start')
  @ApiOkResponse({ description: 'Item preparation started.' })
  startItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: StartItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.kds.startItem(id, dto, user);
  }

  @Post('items/:id/ready')
  @ApiOkResponse({ description: 'Item marked ready.' })
  readyItem(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.kds.readyItem(id, user);
  }

  @Post('items/:id/served')
  @ApiOkResponse({ description: 'Item marked served.' })
  servedItem(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.kds.servedItem(id, user);
  }

  @Post('orders/:id/start')
  @ApiOkResponse({ description: 'Whole order preparation started.' })
  startOrder(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.kds.startOrder(id, user);
  }

  @Post('orders/:id/ready')
  @ApiOkResponse({ description: 'Whole order marked ready.' })
  readyOrder(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.kds.readyOrder(id, user);
  }

  @Get('categories')
  @ApiOkResponse({ description: 'Kitchen categories returned.' })
  categories(@Query() query: KitchenQueueQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.kds.categories(query, user);
  }

  @Post('categories')
  @ApiCreatedResponse({ description: 'Kitchen category created.' })
  createCategory(@Body() dto: CreateKitchenCategoryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.kds.createCategory(dto, user);
  }

  @Patch('categories/:id')
  @ApiOkResponse({ description: 'Kitchen category updated.' })
  updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateKitchenCategoryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.kds.updateCategory(id, dto, user);
  }
}
