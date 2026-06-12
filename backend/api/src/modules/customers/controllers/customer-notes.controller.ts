import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { CreateCustomerNoteDto } from '../dto/create-customer-note.dto';
import { CustomerNotesService } from '../services/customer-notes.service';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomerNotesController {
  constructor(private readonly notes: CustomerNotesService) {}

  @Post(':id/notes')
  create(
    @Param('id') id: string,
    @Body() dto: CreateCustomerNoteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notes.create(id, dto, user);
  }

  @Get(':id/notes')
  list(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.notes.list(id, user);
  }
}
