import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateReservationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiProperty()
  @IsUUID()
  outletId!: string;

  @ApiProperty()
  @IsUUID()
  tableId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  customerName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsPhoneNumber()
  customerPhone?: string;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  reservationDate!: Date;

  @ApiProperty()
  @IsInt()
  @Min(1)
  guestCount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  specialInstructions?: string;
}
