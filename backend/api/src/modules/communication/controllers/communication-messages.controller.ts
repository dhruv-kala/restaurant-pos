import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import {
  CommunicationMessageQueryDto,
  CommunicationMessageScopeDto,
} from '../dto/communication-message-query.dto';
import { CommunicationHistoryService } from '../services/communication-history.service';

@ApiTags('Communication History')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('communication/messages')
export class CommunicationMessagesController {
  constructor(private readonly history: CommunicationHistoryService) {}

  @Get()
  list(@Query() query: CommunicationMessageQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.history.list(query, actor);
  }

  @Get(':id')
  detail(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: CommunicationMessageScopeDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.history.detail(id, query, actor);
  }

  @Get(':id/attempts')
  attempts(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: CommunicationMessageScopeDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.history.attempts(id, query, actor);
  }
}
