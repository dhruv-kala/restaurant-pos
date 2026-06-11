import {
  Body,
  Controller,
  Delete,
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
import { AddOrderItemDto } from '../dto/add-order-item.dto';
import { CancelOrderDto } from '../dto/cancel-order.dto';
import { CreateOrderDto } from '../dto/create-order.dto';
import { OrderQueryDto } from '../dto/order-query.dto';
import { OrderListResponseDto, OrderResponseDto } from '../dto/order-response.dto';
import { TransferOrderDto } from '../dto/transfer-order.dto';
import { UpdateOrderItemDto } from '../dto/update-order-item.dto';
import { UpdateOrderStatusDto } from '../dto/update-order-status.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';
import { OrdersService } from '../services/orders.service';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post('orders')
  @ApiCreatedResponse({ type: OrderResponseDto })
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: AuthenticatedUser) {
    return this.orders.create(dto, user);
  }

  @Get('orders')
  @ApiOkResponse({ type: OrderListResponseDto })
  findAll(@Query() query: OrderQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.orders.findAll(query, user);
  }

  @Get('orders/kitchen/queue')
  @ApiOkResponse({ type: [OrderResponseDto] })
  kitchenQueue(@CurrentUser() user: AuthenticatedUser) {
    return this.orders.kitchenQueue(user);
  }

  @Get('orders/:id')
  @ApiOkResponse({ type: OrderResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.orders.findOne(id, user);
  }

  @Patch('orders/:id')
  @ApiOkResponse({ type: OrderResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orders.update(id, dto, user);
  }

  @Patch('orders/:id/status')
  @ApiOkResponse({ type: OrderResponseDto })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orders.updateStatus(id, dto, user);
  }

  @Post('orders/:id/cancel')
  @ApiOkResponse({ type: OrderResponseDto })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orders.cancel(id, dto, user);
  }

  @Post('orders/:id/transfer')
  @ApiOkResponse({ type: OrderResponseDto })
  transfer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransferOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orders.transfer(id, dto, user);
  }

  @Post('orders/:id/items')
  @ApiCreatedResponse({ type: OrderResponseDto })
  addItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddOrderItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orders.addItem(id, dto, user);
  }

  @Patch('order-items/:id')
  @ApiOkResponse({ type: OrderResponseDto })
  updateItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orders.updateItem(id, dto, user);
  }

  @Delete('order-items/:id')
  @ApiOkResponse({ type: OrderResponseDto })
  removeItem(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.orders.removeItem(id, user);
  }
}
