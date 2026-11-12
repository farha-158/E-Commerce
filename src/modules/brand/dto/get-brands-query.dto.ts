import { ApiPropertyOptional } from '@nestjs/swagger';
import { BrandStatus } from '../../../../generated/prisma/browser';

export class GetBrandsQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  limit: number = 20;

  @ApiPropertyOptional({ description: 'Matches name, slug or country' })
  search?: string;

  @ApiPropertyOptional({ enum: ['ALL', ...Object.values(BrandStatus)] })
  status?: BrandStatus | 'ALL';

  @ApiPropertyOptional({ enum: ['ALL', 'INTERNAL', 'PARTNER'], default: 'ALL' })
  type?: 'ALL' | 'INTERNAL' | 'PARTNER' = 'ALL';

  @ApiPropertyOptional({
    enum: ['name', 'productCount', 'createdAt', 'updatedAt'],
    default: 'name',
  })
  sortBy: 'name' | 'productCount' | 'createdAt' | 'updatedAt' = 'name';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc' })
  sortOrder: 'asc' | 'desc' = 'asc';
}
