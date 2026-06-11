import { PartialType } from '@nestjs/swagger';

import { CreateTableSectionDto } from './create-table-section.dto';

export class UpdateTableSectionDto extends PartialType(CreateTableSectionDto) {}
