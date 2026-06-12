import { ApiProperty } from '@nestjs/swagger';
import { MembershipStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateUserStatusDto {
  @ApiProperty({
    enum: [
      MembershipStatus.ACTIVE,
      MembershipStatus.INACTIVE,
      MembershipStatus.SUSPENDED,
      MembershipStatus.INVITED,
    ],
  })
  @IsEnum(MembershipStatus)
  status!: MembershipStatus;
}
