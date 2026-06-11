import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { CreateStationDto } from '../dto/create-station.dto';
import { KitchenQueryDto } from '../dto/kitchen-query.dto';
import { UpdateStationDto } from '../dto/update-station.dto';
import { KitchenStationsService } from '../services/kitchen-stations.service';

@ApiTags('Kitchen')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('kitchen/stations')
export class KitchenStationsController {
  constructor(private readonly stations: KitchenStationsService) {}

  @Post()
  @ApiCreatedResponse({ description: 'Kitchen station created.' })
  create(@Body() dto: CreateStationDto, @CurrentUser() user: AuthenticatedUser) {
    return this.stations.create(dto, user);
  }

  @Get()
  @ApiOkResponse({ description: 'Kitchen stations returned.' })
  findAll(@Query() query: KitchenQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.stations.findAll(query, user);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Kitchen station updated.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.stations.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOkResponse({ description: 'Kitchen station archived.' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.stations.remove(id, user);
  }
}
