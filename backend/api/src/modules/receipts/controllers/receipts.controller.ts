import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { ReceiptType } from '@prisma/client';
import type { Response } from 'express';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { GenerateReceiptDto } from '../dto/generate-receipt.dto';
import { InvoiceQueryDto } from '../dto/invoice-query.dto';
import { PrintReceiptDto } from '../dto/print-receipt.dto';
import { ReceiptQueryDto } from '../dto/receipt-query.dto';
import { ReceiptListResponseDto, ReceiptResponseDto } from '../dto/receipt-response.dto';
import { ReceiptPdfService } from '../services/receipt-pdf.service';
import { ReceiptsService } from '../services/receipts.service';

@ApiTags('Receipts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('receipts')
export class ReceiptsController {
  constructor(
    private readonly receipts: ReceiptsService,
    private readonly pdf: ReceiptPdfService,
  ) {}

  @Post('generate')
  @ApiCreatedResponse({ type: ReceiptResponseDto })
  generate(@Body() dto: GenerateReceiptDto, @CurrentUser() user: AuthenticatedUser) {
    return this.receipts.generate(dto, user);
  }

  @Get()
  @ApiOkResponse({ type: ReceiptListResponseDto })
  findAll(@Query() query: ReceiptQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.receipts.findAll(query, user);
  }

  @Get('invoices')
  @ApiOkResponse({ type: ReceiptListResponseDto })
  invoices(@Query() query: InvoiceQueryDto, @CurrentUser() user: AuthenticatedUser) {
    query.receiptType = ReceiptType.TAX_INVOICE;
    return this.receipts.findAll(query, user);
  }

  @Get(':id')
  @ApiOkResponse({ type: ReceiptResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.receipts.findOne(id, user);
  }

  @Post(':id/print')
  @ApiCreatedResponse({ type: ReceiptResponseDto })
  print(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PrintReceiptDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.receipts.print(id, dto, user);
  }

  @Post(':id/reprint')
  @ApiCreatedResponse({ type: ReceiptResponseDto })
  reprint(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PrintReceiptDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.receipts.reprint(id, dto, user);
  }

  @Get(':id/pdf')
  @ApiProduces('application/pdf')
  async downloadPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ): Promise<void> {
    const payload = await this.receipts.printable(id, user);
    const bytes = await this.pdf.generate(payload);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${payload.receipt.number}.pdf"`,
    );
    response.send(bytes);
  }
}
