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
import { CreateOutletDto } from './dto/create-outlet.dto';
import {
  OutletListResponseDto,
  OutletResponseDto,
} from './dto/outlet-response.dto';
import { OutletQueryDto } from './dto/outlet-query.dto';
import { UpdateOutletStatusDto } from './dto/update-outlet-status.dto';
import { UpdateOutletDto } from './dto/update-outlet.dto';
import { OutletsService } from './outlets.service';

@ApiTags('Outlets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('outlets')
export class OutletsController {
  constructor(private readonly outletsService: OutletsService) {}

  @Post()
  @ApiOperation({ summary: 'Create an outlet within the allowed tenant scope' })
  @ApiCreatedResponse({ type: OutletResponseDto })
  create(
    @Body() dto: CreateOutletDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OutletResponseDto> {
    return this.outletsService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List accessible outlets' })
  @ApiOkResponse({ type: OutletListResponseDto })
  findAll(
    @Query() query: OutletQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OutletListResponseDto> {
    return this.outletsService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an accessible outlet' })
  @ApiOkResponse({ type: OutletResponseDto })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OutletResponseDto> {
    return this.outletsService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an accessible outlet' })
  @ApiOkResponse({ type: OutletResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOutletDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OutletResponseDto> {
    return this.outletsService.update(id, dto, user);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Change an accessible outlet status' })
  @ApiOkResponse({ type: OutletResponseDto })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOutletStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OutletResponseDto> {
    return this.outletsService.updateStatus(id, dto, user);
  }
}

@ApiTags('Outlets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tenants/:tenantId/outlets')
export class TenantOutletsController {
  constructor(private readonly outletsService: OutletsService) {}

  @Get()
  @ApiOperation({ summary: 'List outlets for an accessible tenant' })
  @ApiOkResponse({ type: OutletListResponseDto })
  findForTenant(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Query() query: OutletQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OutletListResponseDto> {
    return this.outletsService.findAll(query, user, tenantId);
  }
}
