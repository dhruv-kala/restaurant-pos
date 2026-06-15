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
  ChangeScheduledJobStatusDto,
  CreateScheduledJobDto,
  ScheduledJobQueryDto,
  ScheduledJobScopeDto,
} from '../dto/scheduler.dto';
import { SchedulerService } from '../services/scheduler.service';

@ApiTags('Scheduler')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('scheduler/jobs')
export class SchedulerController {
  constructor(private readonly scheduler: SchedulerService) {}

  @Post()
  @ApiOperation({ summary: 'Create a scheduled background job' })
  @ApiCreatedResponse()
  create(
    @Body() dto: CreateScheduledJobDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.scheduler.create(dto, actor, auditRequestMetadata(request));
  }

  @Get()
  @ApiOperation({ summary: 'List scheduled background jobs' })
  @ApiOkResponse()
  list(@Query() query: ScheduledJobQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.scheduler.list(query, actor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a scheduled background job' })
  @ApiOkResponse()
  detail(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ScheduledJobScopeDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.scheduler.detail(id, query, actor);
  }

  @Post(':id/pause')
  @ApiOperation({ summary: 'Pause a scheduled background job' })
  @ApiOkResponse()
  pause(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeScheduledJobStatusDto,
    @Query() query: ScheduledJobScopeDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.scheduler.pause(id, dto, query, actor, auditRequestMetadata(request));
  }

  @Post(':id/resume')
  @ApiOperation({ summary: 'Resume a scheduled background job' })
  @ApiOkResponse()
  resume(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeScheduledJobStatusDto,
    @Query() query: ScheduledJobScopeDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.scheduler.resume(id, dto, query, actor, auditRequestMetadata(request));
  }
}
