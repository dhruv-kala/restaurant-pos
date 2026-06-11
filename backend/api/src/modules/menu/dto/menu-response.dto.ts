import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MenuCategoryResponseDto {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  tenantId!: string;
  @ApiPropertyOptional({ nullable: true })
  parentId!: string | null;
  @ApiProperty()
  name!: string;
  @ApiPropertyOptional({ nullable: true })
  description!: string | null;
  @ApiProperty()
  displayOrder!: number;
  @ApiProperty()
  isActive!: boolean;
  @ApiProperty()
  createdAt!: Date;
  @ApiProperty()
  updatedAt!: Date;
}

export class MenuItemVariantResponseDto {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  menuItemId!: string;
  @ApiProperty()
  name!: string;
  @ApiProperty()
  priceAdjustment!: number;
  @ApiProperty()
  isDefault!: boolean;
}

export class MenuItemAddonResponseDto {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  menuItemId!: string;
  @ApiProperty()
  name!: string;
  @ApiProperty()
  price!: number;
}

export class OutletMenuPriceResponseDto {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  outletId!: string;
  @ApiProperty()
  menuItemId!: string;
  @ApiProperty()
  price!: number;
}

export class MenuItemResponseDto {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  tenantId!: string;
  @ApiProperty()
  categoryId!: string;
  @ApiPropertyOptional({ nullable: true })
  kitchenCategoryId!: string | null;
  @ApiProperty()
  name!: string;
  @ApiPropertyOptional({ nullable: true })
  description!: string | null;
  @ApiPropertyOptional({ nullable: true })
  sku!: string | null;
  @ApiProperty()
  price!: number;
  @ApiPropertyOptional({ nullable: true })
  costPrice!: number | null;
  @ApiPropertyOptional({ nullable: true })
  imageUrl!: string | null;
  @ApiProperty()
  isVegetarian!: boolean;
  @ApiProperty()
  isVegan!: boolean;
  @ApiProperty()
  isAvailable!: boolean;
  @ApiProperty()
  taxPercentage!: number;
  @ApiProperty({ type: [MenuItemVariantResponseDto] })
  variants!: MenuItemVariantResponseDto[];
  @ApiProperty({ type: [MenuItemAddonResponseDto] })
  addons!: MenuItemAddonResponseDto[];
  @ApiProperty({ type: [OutletMenuPriceResponseDto] })
  outletPrices!: OutletMenuPriceResponseDto[];
  @ApiProperty()
  createdAt!: Date;
  @ApiProperty()
  updatedAt!: Date;
}

export class PaginationMetaDto {
  @ApiProperty()
  page!: number;
  @ApiProperty()
  limit!: number;
  @ApiProperty()
  total!: number;
  @ApiProperty()
  totalPages!: number;
}

export class MenuCategoryListResponseDto {
  @ApiProperty({ type: [MenuCategoryResponseDto] })
  data!: MenuCategoryResponseDto[];
  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

export class MenuItemListResponseDto {
  @ApiProperty({ type: [MenuItemResponseDto] })
  data!: MenuItemResponseDto[];
  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
