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
  CreateTaxProfileDto,
  TaxProfileQueryDto,
  UpdateTaxProfileDto,
} from '../dto/tax-profile.dto';
import { TaxProfilesService } from '../services/tax-profiles.service';

@ApiTags('Tax Profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tax/profiles')
export class TaxProfilesController {
  constructor(private readonly profiles: TaxProfilesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a tenant-scoped tax profile' })
  @ApiCreatedResponse()
  create(
    @Body() dto: CreateTaxProfileDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.profiles.create(dto, actor, auditRequestMetadata(request));
  }

  @Get()
  @ApiOperation({ summary: 'List tenant tax profiles' })
  @ApiOkResponse()
  list(@Query() query: TaxProfileQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.profiles.list(query, actor);
  }

  @Get('default')
  @ApiOperation({ summary: 'Resolve the active default tax profile' })
  @ApiOkResponse()
  defaultProfile(@Query() query: TaxProfileQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.profiles.defaultProfile(query, actor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a tax profile' })
  @ApiOkResponse()
  detail(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: TaxProfileQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.profiles.detail(id, query, actor);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a tax profile with optimistic concurrency' })
  @ApiOkResponse()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaxProfileDto,
    @Query() query: TaxProfileQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.profiles.update(id, dto, query, actor, auditRequestMetadata(request));
  }
}
