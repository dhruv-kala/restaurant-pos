import { Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { InventoryQueryDto } from '../dto/inventory-query.dto';
import { AlertsService } from '../services/alerts.service';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inventory/alerts')
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Get()
  @ApiOkResponse()
  findAll(@Query() query: InventoryQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.alerts.findAll(query, user);
  }

  @Patch(':id/resolve')
  @ApiOkResponse()
  resolve(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.alerts.resolve(id, user);
  }
}
