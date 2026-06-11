import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class TransferTableDto {
  @ApiProperty()
  @IsUUID()
  fromTableId!: string;

  @ApiProperty()
  @IsUUID()
  toTableId!: string;
}
