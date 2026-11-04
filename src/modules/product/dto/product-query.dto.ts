import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ProductQueryDto {
  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    description: 'Number of products per page',
    example: 10,
    default: 10,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 10;

  @ApiPropertyOptional({
    description: 'Search products by name, SKU, or other supported fields',
    example: 'AeroSound',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter products by category ID',
    example: 'category-123',
    default: 'all',
  })
  @IsOptional()
  @IsString()
  category: string = 'all';

  @ApiPropertyOptional({
    description: 'Filter products by publication status',
    enum: ['all', 'published', 'draft', 'unpublished', 'archived'],
    example: 'published',
    default: 'all',
  })
  @IsOptional()
  @IsIn(['all', 'published', 'draft', 'unpublished', 'archived'])
  status: string = 'all';

  @ApiPropertyOptional({
    description: 'Filter products by stock availability',
    enum: ['all', 'in_stock', 'low_stock', 'out_of_stock'],
    example: 'in_stock',
    default: 'all',
  })
  @IsOptional()
  @IsIn(['all', 'in_stock', 'low_stock', 'out_of_stock'])
  stock: string = 'all';

  @ApiPropertyOptional({
    description: 'Filter products by brand ID',
    example: 'brand-123',
    default: 'all',
  })
  @IsOptional()
  @IsString()
  brand: string = 'all';

  @ApiPropertyOptional({
    description: 'Field used to sort products',
    enum: ['name', 'price', 'stock', 'updatedAt'],
    example: 'updatedAt',
    default: 'updatedAt',
  })
  @IsOptional()
  @IsIn(['name', 'price', 'stock', 'updatedAt'])
  sortBy: string = 'updatedAt';

  @ApiPropertyOptional({
    description: 'Sorting direction',
    enum: ['asc', 'desc'],
    example: 'desc',
    default: 'desc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'desc';
}
