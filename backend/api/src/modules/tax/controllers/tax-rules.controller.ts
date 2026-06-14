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
  CreateTaxCategoryMappingDto,
  CreateTaxGroupDto,
  CreateTaxRateDto,
  CreateTaxRuleDto,
  TaxConfigurationQueryDto,
  UpdateTaxCategoryMappingDto,
  UpdateTaxGroupDto,
  UpdateTaxRateDto,
  UpdateTaxRuleDto,
} from '../dto/tax-rules.dto';
import { TaxRulesService } from '../services/tax-rules.service';

@ApiTags('Tax Rules and Rates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tax')
export class TaxRulesController {
  constructor(private readonly taxRules: TaxRulesService) {}

  @Post('rates')
  @ApiOperation({ summary: 'Create a tenant-scoped tax rate' })
  @ApiCreatedResponse()
  createRate(
    @Body() dto: CreateTaxRateDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.taxRules.createRate(dto, actor, auditRequestMetadata(request));
  }

  @Get('rates')
  @ApiOperation({ summary: 'List tenant tax rates' })
  @ApiOkResponse()
  listRates(@Query() query: TaxConfigurationQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.taxRules.listRates(query, actor);
  }

  @Get('rates/:id')
  @ApiOperation({ summary: 'Get a tax rate' })
  @ApiOkResponse()
  detailRate(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: TaxConfigurationQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.taxRules.detailRate(id, query, actor);
  }

  @Patch('rates/:id')
  @ApiOperation({ summary: 'Update mutable tax rate metadata with optimistic concurrency' })
  @ApiOkResponse()
  updateRate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaxRateDto,
    @Query() query: TaxConfigurationQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.taxRules.updateRate(id, dto, query, actor, auditRequestMetadata(request));
  }

  @Post('groups')
  @ApiOperation({ summary: 'Create a tax group from active tax rates' })
  @ApiCreatedResponse()
  createGroup(
    @Body() dto: CreateTaxGroupDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.taxRules.createGroup(dto, actor, auditRequestMetadata(request));
  }

  @Get('groups')
  @ApiOperation({ summary: 'List tax groups' })
  @ApiOkResponse()
  listGroups(@Query() query: TaxConfigurationQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.taxRules.listGroups(query, actor);
  }

  @Get('groups/:id')
  @ApiOperation({ summary: 'Get a tax group' })
  @ApiOkResponse()
  detailGroup(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: TaxConfigurationQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.taxRules.detailGroup(id, query, actor);
  }

  @Patch('groups/:id')
  @ApiOperation({ summary: 'Update a tax group with optimistic concurrency' })
  @ApiOkResponse()
  updateGroup(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaxGroupDto,
    @Query() query: TaxConfigurationQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.taxRules.updateGroup(id, dto, query, actor, auditRequestMetadata(request));
  }

  @Post('rules')
  @ApiOperation({ summary: 'Create a tax rule that points to a tax group' })
  @ApiCreatedResponse()
  createRule(
    @Body() dto: CreateTaxRuleDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.taxRules.createRule(dto, actor, auditRequestMetadata(request));
  }

  @Get('rules')
  @ApiOperation({ summary: 'List tax rules' })
  @ApiOkResponse()
  listRules(@Query() query: TaxConfigurationQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.taxRules.listRules(query, actor);
  }

  @Get('rules/:id')
  @ApiOperation({ summary: 'Get a tax rule' })
  @ApiOkResponse()
  detailRule(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: TaxConfigurationQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.taxRules.detailRule(id, query, actor);
  }

  @Patch('rules/:id')
  @ApiOperation({ summary: 'Update a tax rule with optimistic concurrency' })
  @ApiOkResponse()
  updateRule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaxRuleDto,
    @Query() query: TaxConfigurationQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.taxRules.updateRule(id, dto, query, actor, auditRequestMetadata(request));
  }

  @Post('category-mappings')
  @ApiOperation({ summary: 'Map a menu category or item to a tax rule' })
  @ApiCreatedResponse()
  createMapping(
    @Body() dto: CreateTaxCategoryMappingDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.taxRules.createMapping(dto, actor, auditRequestMetadata(request));
  }

  @Get('category-mappings')
  @ApiOperation({ summary: 'List tax category and item mappings' })
  @ApiOkResponse()
  listMappings(@Query() query: TaxConfigurationQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.taxRules.listMappings(query, actor);
  }

  @Get('category-mappings/:id')
  @ApiOperation({ summary: 'Get a tax category or item mapping' })
  @ApiOkResponse()
  detailMapping(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: TaxConfigurationQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.taxRules.detailMapping(id, query, actor);
  }

  @Patch('category-mappings/:id')
  @ApiOperation({ summary: 'Update a tax mapping with optimistic concurrency' })
  @ApiOkResponse()
  updateMapping(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaxCategoryMappingDto,
    @Query() query: TaxConfigurationQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.taxRules.updateMapping(id, dto, query, actor, auditRequestMetadata(request));
  }
}
