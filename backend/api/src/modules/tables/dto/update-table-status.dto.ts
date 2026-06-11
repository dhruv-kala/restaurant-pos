import { ApiProperty } from '@nestjs/swagger';
import { DiningTableStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateTableStatusDto {
  @ApiProperty({ enum: DiningTableStatus })
  @IsEnum(DiningTableStatus)
  status!: DiningTableStatus;
}
