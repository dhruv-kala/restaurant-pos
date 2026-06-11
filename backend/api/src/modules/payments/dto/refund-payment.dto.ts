import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';

export class RefundPaymentDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  refundAmount!: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  refundReason!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  idempotencyKey!: string;
}
