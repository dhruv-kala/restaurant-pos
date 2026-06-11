import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';

export class CreateAddonDto {
  @ApiProperty({ example: 'Extra Cheese' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 5000, description: 'Price in minor units' })
  @IsInt()
  @Min(0)
  price!: number;
}
