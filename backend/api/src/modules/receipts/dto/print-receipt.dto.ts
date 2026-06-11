import { ApiPropertyOptional } from '@nestjs/swagger';
import { PrinterType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class PrintReceiptDto {
  @ApiPropertyOptional({ default: 'Default POS Printer' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  printerName = 'Default POS Printer';

  @ApiPropertyOptional({ enum: PrinterType, default: PrinterType.MOCK })
  @IsOptional()
  @IsEnum(PrinterType)
  printerType: PrinterType = PrinterType.MOCK;

  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  copies = 1;
}
