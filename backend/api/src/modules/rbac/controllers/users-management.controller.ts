import {
  Body,
  Controller,
  Get,
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
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { CreateUserDto } from '../dto/create-user.dto';
import { InviteUserDto } from '../dto/invite-user.dto';
import { RbacQueryDto } from '../dto/rbac-query.dto';
import { UpdateUserStatusDto } from '../dto/update-user-status.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UsersManagementService } from '../services/users-management.service';

@ApiTags('RBAC')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rbac/users')
export class UsersManagementController {
  constructor(private readonly users: UsersManagementService) {}

  @Post()
  @ApiOperation({ summary: 'Create a tenant user and access assignments' })
  @ApiCreatedResponse()
  create(
    @Body() dto: CreateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<object> {
    return this.users.create(dto, actor);
  }

  @Post('invite')
  @ApiOperation({ summary: 'Invite a user without exposing a credential' })
  @ApiCreatedResponse()
  invite(
    @Body() dto: InviteUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<object> {
    return this.users.invite(dto, actor);
  }

  @Get()
  @ApiOperation({ summary: 'List tenant users with role and outlet filters' })
  @ApiOkResponse()
  findAll(
    @Query() query: RbacQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<object> {
    return this.users.findAll(query, actor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a tenant user and effective access' })
  @ApiOkResponse()
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<object> {
    return this.users.findOne(id, actor);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update safe user profile fields' })
  @ApiOkResponse()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<object> {
    return this.users.update(id, dto, actor);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Change tenant-local user membership status' })
  @ApiOkResponse()
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<object> {
    return this.users.updateStatus(id, dto, actor);
  }

  @Post(':id/reset-password')
  @ApiOperation({ summary: 'Initialize a safe password reset foundation' })
  @ApiOkResponse()
  resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<object> {
    return this.users.resetPassword(id, actor);
  }
}
