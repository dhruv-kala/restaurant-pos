import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class TransferOrderDto {
  @ApiProperty()
  @IsUUID()
  targetTableId!: string;
}
