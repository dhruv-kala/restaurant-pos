import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { SplitBillMode } from '../enums/billing.enums';

export class ItemSplitGroupDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  orderItemIds!: string[];
}

export class SplitBillDto {
  @ApiProperty({ enum: SplitBillMode })
  @IsEnum(SplitBillMode)
  splitMode!: SplitBillMode;

  @ApiPropertyOptional({ default: 2 })
  @IsOptional()
  @IsInt()
  @Min(2)
  splitCount?: number;

  @ApiPropertyOptional({ type: [Number], description: 'Minor-unit totals.' })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @IsInt({ each: true })
  @Min(0, { each: true })
  customAmounts?: number[];

  @ApiPropertyOptional({ type: [ItemSplitGroupDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => ItemSplitGroupDto)
  itemGroups?: ItemSplitGroupDto[];
}
