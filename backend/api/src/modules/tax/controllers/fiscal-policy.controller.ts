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
  CreateFiscalInvoiceSequenceDto,
  CreateOutletFiscalPolicyDto,
  FiscalPolicyQueryDto,
  FiscalSequenceQueryDto,
  GenerateFiscalInvoiceNumberDto,
  UpdateFiscalInvoiceSequenceDto,
  UpdateOutletFiscalPolicyDto,
} from '../dto/fiscal-policy.dto';
import { FiscalPolicyService } from '../services/fiscal-policy.service';

@ApiTags('Fiscal Policy')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tax')
export class FiscalPolicyController {
  constructor(private readonly fiscalPolicy: FiscalPolicyService) {}

  @Post('fiscal-policies')
  @ApiOperation({ summary: 'Create an outlet fiscal policy' })
  @ApiCreatedResponse()
  createPolicy(
    @Body() dto: CreateOutletFiscalPolicyDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.fiscalPolicy.createPolicy(dto, actor, auditRequestMetadata(request));
  }

  @Get('fiscal-policies')
  @ApiOperation({ summary: 'List outlet fiscal policies' })
  @ApiOkResponse()
  listPolicies(@Query() query: FiscalPolicyQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.fiscalPolicy.listPolicies(query, actor);
  }

  @Get('fiscal-policies/:id')
  @ApiOperation({ summary: 'Get an outlet fiscal policy' })
  @ApiOkResponse()
  detailPolicy(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: FiscalPolicyQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.fiscalPolicy.detailPolicy(id, query, actor);
  }

  @Patch('fiscal-policies/:id')
  @ApiOperation({ summary: 'Update an outlet fiscal policy with optimistic concurrency' })
  @ApiOkResponse()
  updatePolicy(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOutletFiscalPolicyDto,
    @Query() query: FiscalPolicyQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.fiscalPolicy.updatePolicy(id, dto, query, actor, auditRequestMetadata(request));
  }

  @Post('fiscal-sequences')
  @ApiOperation({ summary: 'Create an outlet fiscal invoice sequence' })
  @ApiCreatedResponse()
  createSequence(
    @Body() dto: CreateFiscalInvoiceSequenceDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.fiscalPolicy.createSequence(dto, actor, auditRequestMetadata(request));
  }

  @Get('fiscal-sequences')
  @ApiOperation({ summary: 'List fiscal invoice sequences' })
  @ApiOkResponse()
  listSequences(@Query() query: FiscalSequenceQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.fiscalPolicy.listSequences(query, actor);
  }

  @Get('fiscal-sequences/:id')
  @ApiOperation({ summary: 'Get a fiscal invoice sequence' })
  @ApiOkResponse()
  detailSequence(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: FiscalSequenceQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.fiscalPolicy.detailSequence(id, query, actor);
  }

  @Patch('fiscal-sequences/:id')
  @ApiOperation({ summary: 'Update a fiscal invoice sequence with optimistic concurrency' })
  @ApiOkResponse()
  updateSequence(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFiscalInvoiceSequenceDto,
    @Query() query: FiscalSequenceQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.fiscalPolicy.updateSequence(id, dto, query, actor, auditRequestMetadata(request));
  }

  @Post('fiscal-sequences/:id/generate')
  @ApiOperation({ summary: 'Generate the next fiscal invoice number' })
  @ApiOkResponse()
  generateInvoiceNumber(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GenerateFiscalInvoiceNumberDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.fiscalPolicy.generateInvoiceNumber(
      id,
      dto,
      actor,
      auditRequestMetadata(request),
    );
  }
}
