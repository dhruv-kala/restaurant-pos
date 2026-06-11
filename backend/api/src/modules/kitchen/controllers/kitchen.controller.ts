import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { KitchenQueryDto } from '../dto/kitchen-query.dto';
import { UpdateItemStatusDto } from '../dto/update-item-status.dto';
import { UpdateKitchenOrderStatusDto } from '../dto/update-order-status.dto';
import { KitchenService } from '../services/kitchen.service';

@ApiTags('Kitchen')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('kitchen')
export class KitchenController {
  constructor(private readonly kitchen: KitchenService) {}

  @Get('queue')
  @ApiOkResponse({ description: 'Station-aware kitchen queue returned.' })
  queue(@Query() query: KitchenQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.kitchen.queue(query, user);
  }

  @Get('metrics')
  @ApiOkResponse({ description: 'Kitchen performance metrics returned.' })
  metrics(@Query() query: KitchenQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.kitchen.metrics(query, user);
  }

  @Patch('items/:id/status')
  @ApiOkResponse({ description: 'Kitchen item status updated.' })
  updateItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateItemStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.kitchen.updateItem(id, dto, user);
  }

  @Patch('orders/:id/status')
  @ApiOkResponse({ description: 'Kitchen order status updated.' })
  updateOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateKitchenOrderStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.kitchen.updateOrder(id, dto, user);
  }
}
