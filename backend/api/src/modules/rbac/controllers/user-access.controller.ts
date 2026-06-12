import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { AssignOutletAccessDto } from '../dto/assign-outlet-access.dto';
import { AssignRoleDto } from '../dto/assign-role.dto';
import { UserAccessService } from '../services/user-access.service';

@ApiTags('RBAC')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rbac/users/:id')
export class UserAccessController {
  constructor(private readonly access: UserAccessService) {}

  @Post('roles')
  @ApiOperation({ summary: 'Replace tenant role assignments for a user' })
  @ApiOkResponse()
  assignRoles(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignRoleDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<object[]> {
    return this.access.assignRoles(id, dto, actor);
  }

  @Get('roles')
  @ApiOperation({ summary: 'List tenant role assignments for a user' })
  @ApiOkResponse()
  getRoles(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<object[]> {
    return this.access.getRoles(id, actor);
  }

  @Post('outlets')
  @ApiOperation({ summary: 'Replace outlet access assignments for a user' })
  @ApiOkResponse()
  assignOutlets(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignOutletAccessDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<object[]> {
    return this.access.assignOutlets(id, dto, actor);
  }

  @Get('outlets')
  @ApiOperation({ summary: 'List outlet access assignments for a user' })
  @ApiOkResponse()
  getOutlets(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<object[]> {
    return this.access.getOutlets(id, actor);
  }
}
