import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { auditRequestMetadata } from '../../audit/services/audit-request.util';
import {
  CashDrawerQueryDto,
  CloseCashDrawerDto,
  CreateCashDrawerTransactionDto,
  CurrentCashDrawerQueryDto,
  OpenCashDrawerDto,
  TenantCashDrawerQueryDto,
} from '../dto/cash-drawer.dto';
import { CashDrawersService } from '../services/cash-drawers.service';

@ApiTags('Cash Drawers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cash-drawers')
export class CashDrawersController {
  constructor(private readonly drawers: CashDrawersService) {}

  @Post('open')
  @ApiOperation({ summary: 'Open a cash drawer for an active shift session' })
  @ApiCreatedResponse()
  open(
    @Body() dto: OpenCashDrawerDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.drawers.open(dto, actor, auditRequestMetadata(request));
  }

  @Get()
  @ApiOperation({ summary: 'List cash drawers' })
  @ApiOkResponse()
  list(@Query() query: CashDrawerQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.drawers.list(query, actor);
  }

  @Get('current')
  @ApiOperation({ summary: 'Get the current open cash drawer for a shift session' })
  @ApiOkResponse()
  current(@Query() query: CurrentCashDrawerQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.drawers.current(query, actor);
  }

  @Get(':id/transactions')
  @ApiOperation({ summary: 'List append-only cash drawer transactions' })
  @ApiOkResponse()
  transactions(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: TenantCashDrawerQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.drawers.transactions(id, query, actor);
  }

  @Post(':id/transactions')
  @ApiOperation({ summary: 'Record a cash drawer adjustment transaction' })
  @ApiCreatedResponse()
  addTransaction(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCashDrawerTransactionDto,
    @Query() query: TenantCashDrawerQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.drawers.addTransaction(id, dto, query, actor, auditRequestMetadata(request));
  }

  @Patch(':id/close')
  @ApiOperation({ summary: 'Close a cash drawer with counted cash balance' })
  @ApiOkResponse()
  close(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CloseCashDrawerDto,
    @Query() query: TenantCashDrawerQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.drawers.close(id, dto, query, actor, auditRequestMetadata(request));
  }
}
