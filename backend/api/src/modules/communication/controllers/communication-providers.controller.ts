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
  CommunicationProviderQueryDto,
  CommunicationProviderScopeDto,
  CreateCommunicationProviderDto,
  UpdateCommunicationProviderDto,
} from '../dto/communication-provider.dto';
import { CommunicationProvidersService } from '../services/communication-providers.service';

@ApiTags('Communication Providers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('communication/providers')
export class CommunicationProvidersController {
  constructor(private readonly providers: CommunicationProvidersService) {}

  @Get()
  list(@Query() query: CommunicationProviderQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.providers.list(query, actor);
  }

  @Post()
  create(
    @Body() dto: CreateCommunicationProviderDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.providers.create(dto, actor, auditRequestMetadata(request));
  }

  @Get(':id')
  detail(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: CommunicationProviderScopeDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.providers.detail(id, query.tenantId, actor);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCommunicationProviderDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.providers.update(id, dto, actor, auditRequestMetadata(request));
  }
}
