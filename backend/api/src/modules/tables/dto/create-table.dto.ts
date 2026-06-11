import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { DiningTableShape, DiningTableStatus } from '@prisma/client';

export class CreateTableDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiProperty()
  @IsUUID()
  outletId!: string;

  @ApiProperty()
  @IsUUID()
  sectionId!: string;

  @ApiProperty({ example: 'T1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  tableNumber!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string;

  @ApiProperty({ example: 4 })
  @IsInt()
  @Min(1)
  capacity!: number;

  @ApiPropertyOptional({ enum: DiningTableStatus })
  @IsOptional()
  @IsEnum(DiningTableStatus)
  status?: DiningTableStatus;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  xPosition?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  yPosition?: number;

  @ApiPropertyOptional({ enum: DiningTableShape })
  @IsOptional()
  @IsEnum(DiningTableShape)
  shape?: DiningTableShape;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
