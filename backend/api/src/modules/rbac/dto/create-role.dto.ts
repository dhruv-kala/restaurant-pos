import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateRoleDto {
  @ApiPropertyOptional({ description: 'Required for SUPER_ADMIN' })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'FLOOR_SUPERVISOR' })
  @IsString()
  @Matches(/^[A-Z][A-Z0-9_]{1,79}$/)
  code!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
