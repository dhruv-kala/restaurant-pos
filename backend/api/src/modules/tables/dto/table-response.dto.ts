import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiningTableShape, DiningTableStatus, ReservationStatus } from '@prisma/client';

export class TableSectionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiProperty() outletId!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiProperty() displayOrder!: number;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class DiningTableResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiProperty() outletId!: string;
  @ApiProperty() sectionId!: string;
  @ApiProperty() tableNumber!: string;
  @ApiPropertyOptional({ nullable: true }) displayName!: string | null;
  @ApiProperty() capacity!: number;
  @ApiProperty({ enum: DiningTableStatus }) status!: DiningTableStatus;
  @ApiProperty() xPosition!: number;
  @ApiProperty() yPosition!: number;
  @ApiProperty({ enum: DiningTableShape }) shape!: DiningTableShape;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() version!: number;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class TableReservationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiProperty() outletId!: string;
  @ApiProperty() tableId!: string;
  @ApiProperty() customerName!: string;
  @ApiPropertyOptional({ nullable: true }) customerPhone!: string | null;
  @ApiProperty() reservationDate!: Date;
  @ApiProperty() guestCount!: number;
  @ApiPropertyOptional({ nullable: true })
  specialInstructions!: string | null;
  @ApiProperty({ enum: ReservationStatus }) status!: ReservationStatus;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class MergedTableResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiProperty() outletId!: string;
  @ApiProperty() primaryTableId!: string;
  @ApiProperty({ type: [String] }) mergedTableIds!: string[];
  @ApiProperty() createdAt!: Date;
}

export class PaginationMetaDto {
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
}

export class TableSectionListResponseDto {
  @ApiProperty({ type: [TableSectionResponseDto] })
  data!: TableSectionResponseDto[];
  @ApiProperty({ type: PaginationMetaDto }) meta!: PaginationMetaDto;
}
export class DiningTableListResponseDto {
  @ApiProperty({ type: [DiningTableResponseDto] })
  data!: DiningTableResponseDto[];
  @ApiProperty({ type: PaginationMetaDto }) meta!: PaginationMetaDto;
}
export class ReservationListResponseDto {
  @ApiProperty({ type: [TableReservationResponseDto] })
  data!: TableReservationResponseDto[];
  @ApiProperty({ type: PaginationMetaDto }) meta!: PaginationMetaDto;
}
