import { Module } from '@nestjs/common';

import { NotificationAdminController } from './controllers/notification-admin.controller';
import { NotificationsController } from './controllers/notifications.controller';
import { NotificationsService } from './services/notifications.service';

@Module({
  controllers: [NotificationAdminController, NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
