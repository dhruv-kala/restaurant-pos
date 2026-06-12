import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { AssignPermissionsDto } from '../dto/assign-permissions.dto';
import { CreateRoleDto } from '../dto/create-role.dto';
import { RbacQueryDto } from '../dto/rbac-query.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { RolesService } from '../services/roles.service';

@ApiTags('RBAC')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rbac/roles')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a tenant-scoped custom role' })
  @ApiCreatedResponse()
  create(
    @Body() dto: CreateRoleDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<object> {
    return this.roles.create(dto, actor);
  }

  @Get()
  @ApiOperation({ summary: 'List tenant roles and assignment counts' })
  @ApiOkResponse()
  findAll(
    @Query() query: RbacQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<object> {
    return this.roles.findAll(query, actor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a tenant role' })
  @ApiOkResponse()
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<object> {
    return this.roles.findOne(id, actor);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a custom role' })
  @ApiOkResponse()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<object> {
    return this.roles.update(id, dto, actor);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Archive an unassigned custom role' })
  @ApiNoContentResponse()
  delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    return this.roles.delete(id, actor);
  }

  @Post(':id/permissions')
  @ApiOperation({ summary: 'Replace a role permission assignment set' })
  @ApiOkResponse()
  assignPermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignPermissionsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<object[]> {
    return this.roles.assignPermissions(id, dto, actor);
  }

  @Get(':id/permissions')
  @ApiOperation({ summary: 'List permissions assigned to a role' })
  @ApiOkResponse()
  getPermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<object[]> {
    return this.roles.getPermissions(id, actor);
  }
}
