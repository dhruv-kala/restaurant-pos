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
  CloseShiftSessionDto,
  CurrentShiftSessionQueryDto,
  OpenShiftSessionDto,
  ShiftSessionQueryDto,
  TenantShiftSessionQueryDto,
} from '../dto/shift-session.dto';
import { ShiftSessionsService } from '../services/shift-sessions.service';

@ApiTags('Shift Sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shift-sessions')
export class ShiftSessionsController {
  constructor(private readonly sessions: ShiftSessionsService) {}

  @Post('open')
  @ApiOperation({ summary: 'Open an operational shift session' })
  @ApiCreatedResponse()
  open(
    @Body() dto: OpenShiftSessionDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.sessions.open(dto, actor, auditRequestMetadata(request));
  }

  @Get()
  @ApiOperation({ summary: 'List operational shift sessions' })
  @ApiOkResponse()
  list(@Query() query: ShiftSessionQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.sessions.list(query, actor);
  }

  @Get('current')
  @ApiOperation({ summary: 'Get the current open shift session for a user' })
  @ApiOkResponse()
  current(@Query() query: CurrentShiftSessionQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.sessions.current(query, actor);
  }

  @Patch(':id/close')
  @ApiOperation({ summary: 'Close an operational shift session with optimistic concurrency' })
  @ApiOkResponse()
  close(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CloseShiftSessionDto,
    @Query() query: TenantShiftSessionQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.sessions.close(id, dto, query, actor, auditRequestMetadata(request));
  }
}
