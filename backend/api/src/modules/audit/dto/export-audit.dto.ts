import { AuditExportFormat } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsObject, ValidateNested } from 'class-validator';

import { AuditQueryDto } from './audit-query.dto';

export class ExportAuditDto {
  @IsEnum(AuditExportFormat)
  format!: AuditExportFormat;

  @IsObject()
  @ValidateNested()
  @Type(() => AuditQueryDto)
  filters!: AuditQueryDto;
}
