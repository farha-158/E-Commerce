import { ApiProperty } from '@nestjs/swagger';
import { CollectionStatus } from '../../../../generated/prisma/browser';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsString,
} from 'class-validator';

export class BulkCollectionStatusDto {
  @ApiProperty({ type: [String], example: ['col-1', 'col-2'] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsString({ each: true })
  collectionIds: string[];

  @ApiProperty({ enum: CollectionStatus, example: CollectionStatus.ACTIVE })
  @IsEnum(CollectionStatus)
  status: CollectionStatus;
}
