import { ApiPropertyOptional } from '@nestjs/swagger';
import { CollectionDisplayLocation, CollectionStatus } from '../../../../generated/prisma/browser';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GetCollectionsQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({ description: 'Matches title, slug or badgeText' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['ALL', ...Object.values(CollectionStatus)] })
  @IsOptional()
  @IsIn(['ALL', ...Object.values(CollectionStatus)])
  status?: CollectionStatus | 'ALL';

  @ApiPropertyOptional({
    enum: ['ALL', ...Object.values(CollectionDisplayLocation)],
  })
  @IsOptional()
  @IsIn(['ALL', ...Object.values(CollectionDisplayLocation)])
  location?: CollectionDisplayLocation | 'ALL';

  @ApiPropertyOptional({
    enum: ['title', 'productCount', 'createdAt', 'updatedAt'],
    default: 'title',
  })
  @IsOptional()
  @IsIn(['title', 'productCount', 'createdAt', 'updatedAt'])
  sortBy: 'title' | 'productCount' | 'createdAt' | 'updatedAt' = 'title';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'asc';
}
