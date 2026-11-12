import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsString,
} from 'class-validator';

export const COLLECTION_PRODUCT_ACTIONS = ['add', 'remove', 'set'] as const;
export type CollectionProductAction =
  (typeof COLLECTION_PRODUCT_ACTIONS)[number];

export class ManageCollectionProductsDto {
  @ApiProperty({
    enum: COLLECTION_PRODUCT_ACTIONS,
    example: 'add',
    description:
      "'set' replaces the entire collection items with the provided IDs",
  })
  @IsIn(COLLECTION_PRODUCT_ACTIONS)
  action: CollectionProductAction;

  @ApiProperty({ type: [String], example: ['prod-nx-01', 'prod-nx-02'] })
  @IsArray()
  @ArrayMaxSize(500)
  @ArrayUnique()
  @IsString({ each: true })
  productIds: string[];
}
