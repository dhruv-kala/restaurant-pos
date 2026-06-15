import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { OutboxEventQueryDto, OutboxEventScopeDto } from '../dto/outbox-event-query.dto';
import { OutboxEventsService } from '../services/outbox-events.service';

@ApiTags('Outbox Events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('outbox/events')
export class OutboxEventsController {
  constructor(private readonly events: OutboxEventsService) {}

  @Get()
  @ApiOperation({ summary: 'List transactional outbox events' })
  @ApiOkResponse()
  list(@Query() query: OutboxEventQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.events.list(query, actor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a transactional outbox event' })
  @ApiOkResponse()
  detail(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: OutboxEventScopeDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.events.detail(id, query, actor);
  }
}
