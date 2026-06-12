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
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { AuditQueryDto } from '../dto/audit-query.dto';
import { ExportAuditDto } from '../dto/export-audit.dto';
import { auditRequestMetadata } from '../services/audit-request.util';
import { AuditService } from '../services/audit.service';

@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('audit-events')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'List authorized immutable audit events' })
  @ApiOkResponse()
  findAll(
    @Query() query: AuditQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<object> {
    return this.audit.findAll(query, actor, auditRequestMetadata(request));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an authorized audit event' })
  @ApiOkResponse()
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<object> {
    return this.audit.findOne(id, actor, auditRequestMetadata(request));
  }

  @Post('export')
  @ApiOperation({ summary: 'Record an authorized audit export request' })
  @ApiOkResponse()
  export(
    @Body() dto: ExportAuditDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<object> {
    return this.audit.export(dto, actor, auditRequestMetadata(request));
  }
}
