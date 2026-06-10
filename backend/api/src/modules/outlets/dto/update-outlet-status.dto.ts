import { ApiProperty } from '@nestjs/swagger';
import { OutletStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateOutletStatusDto {
  @ApiProperty({ enum: OutletStatus })
  @IsEnum(OutletStatus)
  status!: OutletStatus;
}
