import { ApiProperty } from '@nestjs/swagger';

export class AuthenticatedUserDto {
  @ApiProperty({ example: '01975f6f-b03d-7ac2-893f-c7e858a42ff1' })
  id!: string;

  @ApiProperty({ example: 'admin@example.com' })
  email!: string;

  @ApiProperty({ example: 'Admin User' })
  name!: string;

  @ApiProperty({
    example: '01975f6f-b03d-7ac2-893f-c7e858a42ff2',
    nullable: true,
  })
  tenantId!: string | null;

  @ApiProperty({
    example: '01975f6f-b03d-7ac2-893f-c7e858a42ff3',
    nullable: true,
  })
  outletId!: string | null;

  @ApiProperty({ example: ['TENANT_ADMIN'], type: [String] })
  roles!: string[];

  @ApiProperty({
    example: ['roles.read', 'roles.update', 'users.read'],
    type: [String],
  })
  permissions!: string[];
}

export class TokenPairResponseDto {
  @ApiProperty({ description: 'Short-lived JWT access token' })
  accessToken!: string;

  @ApiProperty({ description: 'Rotating JWT refresh token' })
  refreshToken!: string;
}

export class AuthResponseDto extends TokenPairResponseDto {
  @ApiProperty({ type: AuthenticatedUserDto })
  user!: AuthenticatedUserDto;
}

export class LogoutResponseDto {
  @ApiProperty({ example: 'Logged out successfully' })
  message!: string;
}
