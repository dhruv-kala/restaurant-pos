import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class VoidBillDto {
  @ApiProperty({ example: 'Wrong order' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
