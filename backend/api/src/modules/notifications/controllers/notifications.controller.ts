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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { auditRequestMetadata } from '../../audit/services/audit-request.util';
import { NotificationQueryDto } from '../dto/notification-query.dto';
import { UpdateNotificationPreferencesDto } from '../dto/update-notification-preferences.dto';
import { NotificationsService } from '../services/notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  inbox(@Query() query: NotificationQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.notifications.inbox(query, actor);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() actor: AuthenticatedUser) {
    return this.notifications.unreadCount(actor);
  }

  @Get('preferences')
  preferences(@CurrentUser() actor: AuthenticatedUser) {
    return this.notifications.preferences(actor);
  }

  @Patch('preferences')
  updatePreferences(
    @Body() dto: UpdateNotificationPreferencesDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.notifications.updatePreferences(dto, actor, auditRequestMetadata(request));
  }

  @Post('read-all')
  markAllRead(@CurrentUser() actor: AuthenticatedUser) {
    return this.notifications.markAllRead(actor);
  }

  @Get(':id')
  detail(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.notifications.detail(id, actor);
  }

  @Patch(':id/read')
  markRead(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.notifications.markRead(id, actor);
  }
}
