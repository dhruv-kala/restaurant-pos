import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { CommunicationAnalyticsQueryDto } from '../dto/communication-analytics.dto';
import { CommunicationAnalyticsService } from '../services/communication-analytics.service';

@ApiTags('Communication Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('communication/analytics')
export class CommunicationAnalyticsController {
  constructor(private readonly analytics: CommunicationAnalyticsService) {}

  @Get()
  report(
    @Query() query: CommunicationAnalyticsQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.analytics.report(query, actor);
  }

  @Get('summary')
  async summary(
    @Query() query: CommunicationAnalyticsQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const report = await this.analytics.report(query, actor);
    return { scope: report.scope, summary: report.summary };
  }

  @Get('channels')
  async channels(
    @Query() query: CommunicationAnalyticsQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const report = await this.analytics.report(query, actor);
    return { scope: report.scope, channels: report.channels };
  }

  @Get('providers')
  async providers(
    @Query() query: CommunicationAnalyticsQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const report = await this.analytics.report(query, actor);
    return { scope: report.scope, providers: report.providers };
  }

  @Get('trends')
  async trends(
    @Query() query: CommunicationAnalyticsQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const report = await this.analytics.report(query, actor);
    return { scope: report.scope, trends: report.trends };
  }
}
