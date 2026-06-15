import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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

import { auditRequestMetadata } from '../../audit/services/audit-request.util';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import {
  CreateShiftReconciliationDto,
  ShiftReconciliationQueryDto,
  TenantShiftReconciliationQueryDto,
} from '../dto/shift-reconciliation.dto';
import { ShiftReconciliationsService } from '../services/shift-reconciliations.service';

@ApiTags('Shift Reconciliations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shift-reconciliations')
export class ShiftReconciliationsController {
  constructor(private readonly reconciliations: ShiftReconciliationsService) {}

  @Post()
  @ApiOperation({ summary: 'Record an immutable shift cash reconciliation' })
  @ApiCreatedResponse()
  create(
    @Body() dto: CreateShiftReconciliationDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.reconciliations.create(dto, actor, auditRequestMetadata(request));
  }

  @Get()
  @ApiOperation({ summary: 'List shift reconciliations' })
  @ApiOkResponse()
  list(@Query() query: ShiftReconciliationQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.reconciliations.list(query, actor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one shift reconciliation' })
  @ApiOkResponse()
  get(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: TenantShiftReconciliationQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.reconciliations.get(id, query, actor);
  }
}
