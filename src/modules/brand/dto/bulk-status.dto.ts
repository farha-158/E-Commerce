import { ApiProperty } from '@nestjs/swagger';
import { BrandStatus } from '../../../../generated/prisma/browser';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsString,
} from 'class-validator';

export class BulkStatusDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsString({ each: true })
  @ApiProperty({ type: [String], example: ['brand-1', 'brand-2'] })
  brandIds: string[];

  @IsEnum(BrandStatus)
  @ApiProperty({ enum: BrandStatus, example: BrandStatus.ACTIVE })
  status: BrandStatus;
}
