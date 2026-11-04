import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetCategoriesQueryDto {
  @ApiPropertyOptional({
    description: 'Choose how categories should be displayed',
    enum: ['flat', 'tree'],
    default: 'flat',
    example: 'flat',
  })
  @IsOptional()
  @IsIn(['flat', 'tree'])
  view: 'flat' | 'tree' = 'flat';

  @ApiPropertyOptional({
    description: 'Filter categories by publication status',
    enum: ['all', 'active', 'draft', 'scheduled', 'archived'],
    default: 'all',
    example: 'active',
  })
  @IsOptional()
  @IsIn(['all', 'active', 'draft', 'scheduled', 'archived'])
  status: 'all' | 'active' | 'draft' | 'scheduled' | 'archived' = 'all';

  @ApiPropertyOptional({
    description: 'Filter categories by hierarchy level',
    enum: ['all', 'root', 'subcategory'],
    default: 'all',
    example: 'root',
  })
  @IsOptional()
  @IsIn(['all', 'root', 'subcategory'])
  level: 'all' | 'root' | 'subcategory' = 'all';

  @ApiPropertyOptional({
    description: 'Search categories by name or slug',
    example: 'smart',
    minLength: 1,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MinLength(1)
  search?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
    default: 1,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    description: 'Number of categories per page (maximum 100)',
    example: 50,
    minimum: 1,
    maximum: 100,
    default: 50,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;
}
