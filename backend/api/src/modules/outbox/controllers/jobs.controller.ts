import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { auditRequestMetadata } from '../../audit/services/audit-request.util';
import {
  CancelJobDto,
  DeadLetterQueryDto,
  JobQueryDto,
  JobScopeDto,
  ManualRetryJobDto,
  ResolveDeadLetterDto,
  RetryPolicyQueryDto,
  UpsertRetryPolicyDto,
} from '../dto/jobs.dto';
import { JobRecoveryService } from '../services/job-recovery.service';

@ApiTags('Background Jobs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('jobs')
export class JobsController {
  constructor(private readonly recovery: JobRecoveryService) {}

  @Get('retry-policies')
  @ApiOperation({ summary: 'List background job retry policies' })
  @ApiOkResponse()
  listRetryPolicies(@Query() query: RetryPolicyQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.recovery.listRetryPolicies(query, actor);
  }

  @Put('retry-policies')
  @ApiOperation({ summary: 'Create or update a background job retry policy' })
  @ApiOkResponse()
  upsertRetryPolicy(
    @Body() dto: UpsertRetryPolicyDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.recovery.upsertRetryPolicy(dto, actor, auditRequestMetadata(request));
  }

  @Get('dead-letters')
  @ApiOperation({ summary: 'List dead-lettered background jobs' })
  @ApiOkResponse()
  listDeadLetters(@Query() query: DeadLetterQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.recovery.listDeadLetters(query, actor);
  }

  @Post('dead-letters/:id/resolve')
  @ApiOperation({ summary: 'Resolve a dead-letter record without retrying it' })
  @ApiOkResponse()
  resolveDeadLetter(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveDeadLetterDto,
    @Query() query: JobScopeDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.recovery.resolveDeadLetter(id, dto, query, actor, auditRequestMetadata(request));
  }

  @Get()
  @ApiOperation({ summary: 'List background jobs' })
  @ApiOkResponse()
  listJobs(@Query() query: JobQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.recovery.listJobs(query, actor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a background job' })
  @ApiOkResponse()
  detailJob(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: JobScopeDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.recovery.detailJob(id, query, actor);
  }

  @Get(':id/attempts')
  @ApiOperation({ summary: 'List background job attempts' })
  @ApiOkResponse()
  attempts(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: JobScopeDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.recovery.attempts(id, query, actor);
  }

  @Post(':id/retry')
  @ApiOperation({ summary: 'Manually retry a failed or dead-lettered background job' })
  @ApiOkResponse()
  retryJob(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ManualRetryJobDto,
    @Query() query: JobScopeDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.recovery.retryJob(id, dto, query, actor, auditRequestMetadata(request));
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a pending, retrying, or processing background job' })
  @ApiOkResponse()
  cancelJob(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelJobDto,
    @Query() query: JobScopeDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.recovery.cancelJob(id, dto, query, actor, auditRequestMetadata(request));
  }
}
