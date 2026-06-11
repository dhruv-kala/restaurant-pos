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
import { CreateTableDto } from '../dto/create-table.dto';
import { MergeTableDto } from '../dto/merge-table.dto';
import { SplitTableDto } from '../dto/split-table.dto';
import { TableQueryDto } from '../dto/table-query.dto';
import { TransferTableDto } from '../dto/transfer-table.dto';
import { UpdateTableStatusDto } from '../dto/update-table-status.dto';
import { UpdateTableDto } from '../dto/update-table.dto';
import { TablesService } from '../services/tables.service';

@ApiTags('Tables')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Post()
  @ApiCreatedResponse({ description: 'Dining table created.' })
  create(@Body() dto: CreateTableDto, @CurrentUser() user: AuthenticatedUser) {
    return this.tablesService.create(dto, user);
  }

  @Post('merge')
  @ApiCreatedResponse({ description: 'Tables merged.' })
  merge(@Body() dto: MergeTableDto, @CurrentUser() user: AuthenticatedUser) {
    return this.tablesService.merge(dto, user);
  }

  @Post('split')
  @ApiOkResponse({ description: 'Merged tables split.' })
  split(@Body() dto: SplitTableDto, @CurrentUser() user: AuthenticatedUser) {
    return this.tablesService.split(dto, user);
  }

  @Post('transfer')
  @ApiOkResponse({ description: 'Occupied table transferred.' })
  transfer(@Body() dto: TransferTableDto, @CurrentUser() user: AuthenticatedUser) {
    return this.tablesService.transfer(dto, user);
  }

  @Get()
  @ApiOkResponse({ description: 'Dining tables returned.' })
  findAll(@Query() query: TableQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.tablesService.findAll(query, user);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Dining table returned.' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.tablesService.findOne(id, user);
  }

  @Patch(':id/status')
  @ApiOkResponse({ description: 'Dining table status updated.' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTableStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tablesService.updateStatus(id, dto, user);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Dining table updated.' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTableDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tablesService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOkResponse({ description: 'Dining table deleted.' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.tablesService.remove(id, user);
  }
}
