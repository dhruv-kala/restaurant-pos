import { ApiProperty } from '@nestjs/swagger';
import { ReportExportFormat } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsString, MaxLength, ValidateNested } from 'class-validator';
import { ReportFilterDto } from './report-filter.dto';

export class ExportReportDto {
  @ApiProperty({ example: 'SALES_SUMMARY' })
  @IsString()
  @MaxLength(100)
  reportType!: string;

  @ApiProperty({ enum: ReportExportFormat })
  @IsEnum(ReportExportFormat)
  format!: ReportExportFormat;

  @ApiProperty({ type: ReportFilterDto })
  @ValidateNested()
  @Type(() => ReportFilterDto)
  filters!: ReportFilterDto;
}
