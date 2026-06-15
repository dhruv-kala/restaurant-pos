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
  BusinessDayQueryDto,
  CloseBusinessDayDto,
  CurrentBusinessDayQueryDto,
  OpenBusinessDayDto,
  TenantBusinessDayQueryDto,
} from '../dto/business-day.dto';
import { BusinessDayService } from '../services/business-day.service';

@ApiTags('Business Days')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('business-days')
export class BusinessDayController {
  constructor(private readonly businessDays: BusinessDayService) {}

  @Post('open')
  @ApiOperation({ summary: 'Open an outlet business day' })
  @ApiCreatedResponse()
  open(
    @Body() dto: OpenBusinessDayDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.businessDays.open(dto, actor, auditRequestMetadata(request));
  }

  @Get()
  @ApiOperation({ summary: 'List outlet business days' })
  @ApiOkResponse()
  list(@Query() query: BusinessDayQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.businessDays.list(query, actor);
  }

  @Get('current')
  @ApiOperation({ summary: 'Get the current open business day for an outlet' })
  @ApiOkResponse()
  current(@Query() query: CurrentBusinessDayQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.businessDays.current(query, actor);
  }

  @Patch(':id/close')
  @ApiOperation({ summary: 'Close an open business day with optimistic concurrency' })
  @ApiOkResponse()
  close(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CloseBusinessDayDto,
    @Query() query: TenantBusinessDayQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.businessDays.close(id, dto, query, actor, auditRequestMetadata(request));
  }

  @Get(':id/closing')
  @ApiOperation({ summary: 'Get the immutable business day closing summary' })
  @ApiOkResponse()
  closing(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: TenantBusinessDayQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.businessDays.closing(id, query, actor);
  }
}
