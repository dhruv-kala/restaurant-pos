import { Module } from '@nestjs/common';

import { PermissionsController } from './controllers/permissions.controller';
import { RolesController } from './controllers/roles.controller';
import { UserAccessController } from './controllers/user-access.controller';
import { UsersManagementController } from './controllers/users-management.controller';
import { PermissionsService } from './services/permissions.service';
import { RolesService } from './services/roles.service';
import { UserAccessService } from './services/user-access.service';
import { UsersManagementService } from './services/users-management.service';

@Module({
  controllers: [
    UsersManagementController,
    RolesController,
    PermissionsController,
    UserAccessController,
  ],
  providers: [
    UsersManagementService,
    RolesService,
    PermissionsService,
    UserAccessService,
  ],
})
export class RbacModule {}
