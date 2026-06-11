import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { CreateReservationDto } from '../dto/create-reservation.dto';
import { ReservationQueryDto } from '../dto/table-query.dto';
import { UpdateReservationStatusDto } from '../dto/update-reservation-status.dto';
import { UpdateReservationDto } from '../dto/update-reservation.dto';
import { ReservationsService } from '../services/reservations.service';

@ApiTags('Tables')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @ApiCreatedResponse({ description: 'Reservation created.' })
  create(@Body() dto: CreateReservationDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reservationsService.create(dto, user);
  }

  @Get()
  @ApiOkResponse({ description: 'Reservations returned.' })
  findAll(@Query() query: ReservationQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reservationsService.findAll(query, user);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Reservation returned.' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.reservationsService.findOne(id, user);
  }

  @Patch(':id/status')
  @ApiOkResponse({ description: 'Reservation status updated.' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateReservationStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reservationsService.updateStatus(id, dto, user);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Reservation updated.' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateReservationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reservationsService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOkResponse({ description: 'Reservation cancelled and deleted.' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.reservationsService.remove(id, user);
  }
}
