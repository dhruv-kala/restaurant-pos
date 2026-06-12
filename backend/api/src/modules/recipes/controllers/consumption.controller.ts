import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { RecipeQueryDto } from '../dto/recipe-query.dto';
import { WastageDto } from '../dto/wastage.dto';
import { ConsumptionService } from '../services/consumption.service';

@ApiTags('consumption')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('consumption')
export class ConsumptionController {
  constructor(private readonly consumption: ConsumptionService) {}

  @Get()
  list(@Query() query: RecipeQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.consumption.list(query, user);
  }

  @Get(':id')
  detail(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.consumption.detail(id, user);
  }
}

@ApiTags('inventory-wastage')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inventory/wastage')
export class WastageController {
  constructor(private readonly consumption: ConsumptionService) {}

  @Post()
  record(@Body() dto: WastageDto, @CurrentUser() user: AuthenticatedUser) {
    return this.consumption.recordWastage(dto, user);
  }

  @Get()
  list(@Query() query: RecipeQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.consumption.listWastage(query, user);
  }
}
