import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { CreateCustomerDto } from '../dto/create-customer.dto';
import { CustomerQueryDto } from '../dto/customer-query.dto';
import { UpdateCustomerDto } from '../dto/update-customer.dto';
import { CustomerStatsService } from '../services/customer-stats.service';
import { CustomersService } from '../services/customers.service';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(
    private readonly customers: CustomersService,
    private readonly stats: CustomerStatsService,
  ) {}

  @Post()
  create(@Body() dto: CreateCustomerDto, @CurrentUser() user: AuthenticatedUser) {
    return this.customers.create(dto, user);
  }

  @Get()
  list(@Query() query: CustomerQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.customers.list(query, user);
  }

  @Get('search')
  search(@Query() query: CustomerQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.customers.search(query, user);
  }

  @Get('dashboard')
  dashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.customers.dashboard(user);
  }

  @Get(':id/orders')
  orders(
    @Param('id') id: string,
    @Query() query: CustomerQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.customers.orders(id, query, user);
  }

  @Get(':id/bills')
  bills(
    @Param('id') id: string,
    @Query() query: CustomerQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.customers.bills(id, query, user);
  }

  @Get(':id/payments')
  payments(
    @Param('id') id: string,
    @Query() query: CustomerQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.customers.payments(id, query, user);
  }

  @Get(':id/visits')
  visits(
    @Param('id') id: string,
    @Query() query: CustomerQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.customers.visits(id, query, user);
  }

  @Get(':id/stats')
  customerStats(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.stats.get(id, user);
  }

  @Get(':id')
  detail(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.customers.detail(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.customers.update(id, dto, user);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.customers.remove(id, user);
  }
}
