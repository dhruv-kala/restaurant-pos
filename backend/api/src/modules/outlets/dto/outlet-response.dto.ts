import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OutletStatus } from '@prisma/client';

export class OutletResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  code!: string;

  @ApiPropertyOptional({ nullable: true })
  email!: string | null;

  @ApiPropertyOptional({ nullable: true })
  phone!: string | null;

  @ApiPropertyOptional({ nullable: true })
  addressLine1!: string | null;

  @ApiPropertyOptional({ nullable: true })
  addressLine2!: string | null;

  @ApiPropertyOptional({ nullable: true })
  city!: string | null;

  @ApiPropertyOptional({ nullable: true })
  state!: string | null;

  @ApiPropertyOptional({ nullable: true })
  country!: string | null;

  @ApiPropertyOptional({ nullable: true })
  postalCode!: string | null;

  @ApiProperty()
  timezone!: string;

  @ApiProperty({ enum: OutletStatus })
  status!: OutletStatus;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class OutletPaginationMetaDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class OutletListResponseDto {
  @ApiProperty({ type: [OutletResponseDto] })
  data!: OutletResponseDto[];

  @ApiProperty({ type: OutletPaginationMetaDto })
  meta!: OutletPaginationMetaDto;
}
