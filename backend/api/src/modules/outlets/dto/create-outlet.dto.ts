import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { OutletStatus } from '@prisma/client';

export class CreateOutletDto {
  @ApiPropertyOptional({
    description: 'Required for SUPER_ADMIN; ignored only when absent for tenant users',
  })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiProperty({ example: 'Downtown Outlet' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional({ example: 'DOWNTOWN' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9_-]+$/)
  @MaxLength(32)
  code?: string;

  @ApiPropertyOptional({ example: 'outlet@example.com' })
  @IsOptional()
  @IsEmail()
  @Transform(({ value }: { value: string }) => value.toLowerCase())
  email?: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9][0-9]{7,14}$/)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine1?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine2?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ example: 'IN' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2}$/)
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional({ example: 'Asia/Kolkata' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @ApiPropertyOptional({ enum: OutletStatus, default: OutletStatus.ACTIVE })
  @IsOptional()
  @IsEnum(OutletStatus)
  status?: OutletStatus;
}
