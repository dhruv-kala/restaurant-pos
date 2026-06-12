import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { InventoryQueryDto } from '../dto/inventory-query.dto';
import { StockAdjustmentDto } from '../dto/stock-adjustment.dto';
import { StockTransferDto } from '../dto/stock-transfer.dto';
import { StockService } from '../services/stock.service';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class StockController {
  constructor(private readonly stock: StockService) {}

  @Get('stocks')
  @ApiOkResponse()
  findAll(@Query() query: InventoryQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.stock.findAll(query, user);
  }

  @Get('stocks/:id')
  @ApiOkResponse()
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.stock.findOne(id, user);
  }

  @Post('stocks/adjust')
  @ApiCreatedResponse()
  adjust(@Body() dto: StockAdjustmentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.stock.adjust(dto, user);
  }

  @Post('stocks/transfer')
  @ApiCreatedResponse()
  transfer(@Body() dto: StockTransferDto, @CurrentUser() user: AuthenticatedUser) {
    return this.stock.transfer(dto, user);
  }

  @Get('valuation')
  @ApiOkResponse()
  valuation(@Query() query: InventoryQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.stock.valuation(query, user);
  }
}
