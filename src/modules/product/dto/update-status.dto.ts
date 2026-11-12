import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsString,
} from 'class-validator';
import { ProductStatus } from '../../../../generated/prisma/browser';


export class BulkUpdateProductStatusDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  productIds: string[];

  @IsEnum(ProductStatus)
  status: ProductStatus;
}
