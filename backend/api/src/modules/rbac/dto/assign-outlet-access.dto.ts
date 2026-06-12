import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class AssignOutletAccessDto {
  @ApiProperty({ type: [String], description: 'Empty array removes outlet access' })
  @IsArray()
  @IsUUID('all', { each: true })
  outletIds!: string[];
}
