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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { auditRequestMetadata } from '../../audit/services/audit-request.util';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { NotificationQueryDto } from '../dto/notification-query.dto';
import { NotificationsService } from '../services/notifications.service';

@ApiTags('Notification Administration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications/admin')
export class NotificationAdminController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post()
  create(
    @Body() dto: CreateNotificationDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.notifications.create(dto, actor, auditRequestMetadata(request));
  }

  @Get()
  list(@Query() query: NotificationQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.notifications.adminList(query, actor);
  }

  @Get(':id')
  detail(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: NotificationQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.notifications.adminDetail(id, query, actor);
  }
}
