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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { auditRequestMetadata } from '../../audit/services/audit-request.util';
import {
  CommunicationTemplateQueryDto,
  CommunicationTemplateScopeDto,
  CreateCommunicationTemplateDto,
  PreviewCommunicationTemplateDto,
  UpdateCommunicationTemplateDto,
} from '../dto/communication-template.dto';
import { CommunicationTemplatesService } from '../services/communication-templates.service';

@ApiTags('Communication Templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('communication/templates')
export class CommunicationTemplatesController {
  constructor(private readonly templates: CommunicationTemplatesService) {}

  @Get()
  list(@Query() query: CommunicationTemplateQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.templates.list(query, actor);
  }

  @Post()
  create(
    @Body() dto: CreateCommunicationTemplateDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.templates.create(dto, actor, auditRequestMetadata(request));
  }

  @Get(':id')
  detail(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: CommunicationTemplateScopeDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.templates.detail(id, query.tenantId, actor);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCommunicationTemplateDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.templates.update(id, dto, actor, auditRequestMetadata(request));
  }

  @Get(':id/versions')
  versions(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: CommunicationTemplateScopeDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.templates.versions(id, query.tenantId, actor);
  }

  @Post(':id/preview')
  preview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PreviewCommunicationTemplateDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.templates.preview(id, dto, actor);
  }
}
