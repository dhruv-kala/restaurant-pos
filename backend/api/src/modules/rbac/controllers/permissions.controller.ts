import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { PermissionsService } from '../services/permissions.service';

@ApiTags('RBAC')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rbac/permissions')
export class PermissionsController {
  constructor(private readonly permissions: PermissionsService) {}

  @Get()
  @ApiOperation({ summary: 'List the active permission catalog' })
  @ApiOkResponse()
  findAll(@CurrentUser() actor: AuthenticatedUser): Promise<object[]> {
    return this.permissions.findAll(actor);
  }

  @Get('grouped')
  @ApiOperation({ summary: 'Group active permissions by application module' })
  @ApiOkResponse()
  grouped(
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<Record<string, object[]>> {
    return this.permissions.grouped(actor);
  }
}
