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
import { CreateTableSectionDto } from '../dto/create-table-section.dto';
import { TableQueryDto } from '../dto/table-query.dto';
import { UpdateTableSectionDto } from '../dto/update-table-section.dto';
import { TableSectionsService } from '../services/table-sections.service';

@ApiTags('Tables')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('table-sections')
export class TableSectionsController {
  constructor(private readonly tableSectionsService: TableSectionsService) {}

  @Post()
  @ApiCreatedResponse({ description: 'Table section created.' })
  create(@Body() dto: CreateTableSectionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.tableSectionsService.create(dto, user);
  }

  @Get()
  @ApiOkResponse({ description: 'Table sections returned.' })
  findAll(@Query() query: TableQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.tableSectionsService.findAll(query, user);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Table section returned.' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.tableSectionsService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Table section updated.' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTableSectionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tableSectionsService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOkResponse({ description: 'Table section deleted.' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.tableSectionsService.remove(id, user);
  }
}
