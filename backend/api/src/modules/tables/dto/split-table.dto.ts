import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SplitTableDto {
  @ApiProperty()
  @IsUUID()
  mergedTableId!: string;
}
