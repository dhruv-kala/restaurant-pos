import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateTenantDto } from './dto/create-tenant.dto';
import {
  TenantListResponseDto,
  TenantResponseDto,
} from './dto/tenant-response.dto';
import { TenantQueryDto } from './dto/tenant-query.dto';
import { UpdateTenantStatusDto } from './dto/update-tenant-status.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantsService } from './tenants.service';

@ApiTags('Tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a tenant (SUPER_ADMIN)' })
  @ApiCreatedResponse({ type: TenantResponseDto })
  create(
    @Body() dto: CreateTenantDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TenantResponseDto> {
    return this.tenantsService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List accessible tenants' })
  @ApiOkResponse({ type: TenantListResponseDto })
  findAll(
    @Query() query: TenantQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TenantListResponseDto> {
    return this.tenantsService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an accessible tenant' })
  @ApiOkResponse({ type: TenantResponseDto })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TenantResponseDto> {
    return this.tenantsService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an accessible tenant' })
  @ApiOkResponse({ type: TenantResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTenantDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TenantResponseDto> {
    return this.tenantsService.update(id, dto, user);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Change tenant status (SUPER_ADMIN)' })
  @ApiOkResponse({ type: TenantResponseDto })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTenantStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TenantResponseDto> {
    return this.tenantsService.updateStatus(id, dto, user);
  }
}
