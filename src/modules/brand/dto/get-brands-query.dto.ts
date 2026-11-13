import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsIn,
  Min,
  Max,
} from 'class-validator';

import { BrandStatus } from '../../../../generated/prisma/browser';

export class GetBrandsQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({ description: 'Matches name, slug or country' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['ALL', ...Object.values(BrandStatus)] })
  @IsOptional()
  @IsIn(['ALL', ...Object.values(BrandStatus)])
  status?: BrandStatus | 'ALL';

  @ApiPropertyOptional({ enum: ['ALL', 'INTERNAL', 'PARTNER'], default: 'ALL' })
  @IsOptional()
  @IsIn(['ALL', 'INTERNAL', 'PARTNER'])
  type: 'ALL' | 'INTERNAL' | 'PARTNER' = 'ALL';

  @ApiPropertyOptional({
    enum: ['name', 'productCount', 'createdAt', 'updatedAt'],
    default: 'name',
  })
  @IsOptional()
  @IsIn(['name', 'productCount', 'createdAt', 'updatedAt'])
  sortBy: 'name' | 'productCount' | 'createdAt' | 'updatedAt' = 'name';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'asc';
}
