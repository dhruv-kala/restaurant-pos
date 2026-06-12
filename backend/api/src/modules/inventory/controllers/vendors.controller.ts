import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { CreateVendorDto, UpdateVendorDto } from '../dto/create-vendor.dto';
import { InventoryQueryDto } from '../dto/inventory-query.dto';
import { VendorsService } from '../services/vendors.service';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inventory/vendors')
export class VendorsController {
  constructor(private readonly vendors: VendorsService) {}

  @Post()
  @ApiCreatedResponse()
  create(@Body() dto: CreateVendorDto, @CurrentUser() user: AuthenticatedUser) {
    return this.vendors.create(dto, user);
  }

  @Get()
  @ApiOkResponse()
  findAll(@Query() query: InventoryQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.vendors.findAll(query, user);
  }

  @Patch(':id')
  @ApiOkResponse()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVendorDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vendors.update(id, dto, user);
  }
}
