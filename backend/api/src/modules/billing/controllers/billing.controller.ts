import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { BillQueryDto } from '../dto/bill-query.dto';
import {
  BillListResponseDto,
  BillResponseDto,
  PrintableBillResponseDto,
} from '../dto/bill-response.dto';
import { GenerateBillDto } from '../dto/generate-bill.dto';
import { MergeBillDto } from '../dto/merge-bill.dto';
import { SplitBillDto } from '../dto/split-bill.dto';
import { UpdateBillDto } from '../dto/update-bill.dto';
import { VoidBillDto } from '../dto/void-bill.dto';
import { BillingService } from '../services/billing.service';

@ApiTags('Billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Post('generate')
  @ApiCreatedResponse({ type: BillResponseDto })
  generate(@Body() dto: GenerateBillDto, @CurrentUser() user: AuthenticatedUser) {
    return this.billing.generate(dto, user);
  }

  @Get()
  @ApiOkResponse({ type: BillListResponseDto })
  findAll(@Query() query: BillQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.billing.findAll(query, user);
  }

  @Post('merge')
  @ApiCreatedResponse({ type: BillResponseDto })
  merge(@Body() dto: MergeBillDto, @CurrentUser() user: AuthenticatedUser) {
    return this.billing.merge(dto, user);
  }

  @Get(':id')
  @ApiOkResponse({ type: BillResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.billing.findOne(id, user);
  }

  @Patch(':id')
  @ApiOkResponse({ type: BillResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBillDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.billing.update(id, dto, user);
  }

  @Post(':id/void')
  @ApiOkResponse({ type: BillResponseDto })
  void(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VoidBillDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.billing.void(id, dto, user);
  }

  @Get(':id/print')
  @ApiOkResponse({ type: PrintableBillResponseDto })
  printable(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.billing.printable(id, user);
  }

  @Post(':id/split')
  @ApiCreatedResponse({ type: [BillResponseDto] })
  split(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SplitBillDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.billing.split(id, dto, user);
  }
}
