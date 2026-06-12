import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { CreateCustomerAddressDto } from '../dto/create-customer-address.dto';
import { UpdateCustomerAddressDto } from '../dto/update-customer-address.dto';
import { CustomerAddressesService } from '../services/customer-addresses.service';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomerAddressesController {
  constructor(private readonly addresses: CustomerAddressesService) {}

  @Post(':id/addresses')
  create(
    @Param('id') id: string,
    @Body() dto: CreateCustomerAddressDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.addresses.create(id, dto, user);
  }

  @Get(':id/addresses')
  list(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.addresses.list(id, user);
  }

  @Patch('addresses/:addressId')
  update(
    @Param('addressId') addressId: string,
    @Body() dto: UpdateCustomerAddressDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.addresses.update(addressId, dto, user);
  }

  @Delete('addresses/:addressId')
  delete(
    @Param('addressId') addressId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.addresses.remove(addressId, user);
  }
}
