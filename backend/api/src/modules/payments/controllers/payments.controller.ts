import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { PaymentQueryDto } from '../dto/payment-query.dto';
import { PaymentListResponseDto, PaymentResponseDto } from '../dto/payment-response.dto';
import { RefundPaymentDto } from '../dto/refund-payment.dto';
import { SplitPaymentDto } from '../dto/split-payment.dto';
import { UpdatePaymentStatusDto } from '../dto/update-payment-status.dto';
import { PaymentsService } from '../services/payments.service';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post()
  @ApiCreatedResponse({ type: PaymentResponseDto })
  create(@Body() dto: CreatePaymentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.payments.create(dto, user);
  }

  @Post('split')
  @ApiCreatedResponse({ type: PaymentResponseDto })
  split(@Body() dto: SplitPaymentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.payments.split(dto, user);
  }

  @Get()
  @ApiOkResponse({ type: PaymentListResponseDto })
  findAll(@Query() query: PaymentQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.payments.findAll(query, user);
  }

  @Get(':id')
  @ApiOkResponse({ type: PaymentResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.payments.findOne(id, user);
  }

  @Patch(':id/status')
  @ApiOkResponse({ type: PaymentResponseDto })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePaymentStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.payments.updateStatus(id, dto, user);
  }

  @Post(':id/refund')
  @ApiCreatedResponse({ type: PaymentResponseDto })
  refund(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RefundPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.payments.refund(id, dto, user);
  }
}
