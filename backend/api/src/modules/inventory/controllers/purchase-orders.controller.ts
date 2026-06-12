import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { CreatePurchaseOrderDto, UpdatePurchaseOrderDto } from '../dto/create-po.dto';
import { InventoryQueryDto } from '../dto/inventory-query.dto';
import { PurchaseOrdersService } from '../services/purchase-orders.service';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inventory/purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrders: PurchaseOrdersService) {}

  @Post()
  @ApiCreatedResponse()
  create(@Body() dto: CreatePurchaseOrderDto, @CurrentUser() user: AuthenticatedUser) {
    return this.purchaseOrders.create(dto, user);
  }

  @Get()
  @ApiOkResponse()
  findAll(@Query() query: InventoryQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.purchaseOrders.findAll(query, user);
  }

  @Get(':id')
  @ApiOkResponse()
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.purchaseOrders.findOne(id, user);
  }

  @Patch(':id')
  @ApiOkResponse()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePurchaseOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.purchaseOrders.update(id, dto, user);
  }

  @Post(':id/receive')
  @ApiOkResponse()
  receive(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.purchaseOrders.receive(id, user);
  }
}
