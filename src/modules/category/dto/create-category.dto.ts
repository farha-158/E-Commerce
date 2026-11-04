import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Category name',
    example: 'Smart Wearables',
    minLength: 2,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({
    description: 'Unique URL-friendly category slug',
    example: 'smart-wearables',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must contain lowercase letters, numbers, and hyphens only',
  })
  slug: string;

  @ApiPropertyOptional({
    description: 'Parent category ID. Null means this is a root category.',
    example: 'cm123abc456',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  parentId?: string | null;

  @ApiPropertyOptional({
    description: 'Category description',
    example: 'Discover the latest smart wearable devices.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Category image URL',
    example: 'https://example.com/images/smart-wearables.jpg',
  })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Original image file name',
    example: 'smart-wearables.jpg',
  })
  @IsOptional()
  @IsString()
  imageFileName?: string;

  @ApiPropertyOptional({
    description: 'Image width in pixels',
    example: 1200,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  imageWidth?: number;

  @ApiPropertyOptional({
    description: 'Image height in pixels',
    example: 800,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  imageHeight?: number;

  @ApiPropertyOptional({
    description: 'Image size in bytes',
    example: 245760,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  imageSizeBytes?: number;

  @ApiPropertyOptional({
    description: 'Category publication status',
    enum: ['active', 'draft', 'scheduled'],
    default: 'draft',
    example: 'draft',
  })
  @IsOptional()
  @IsIn(['active', 'draft', 'scheduled'])
  status: 'active' | 'draft' | 'scheduled' = 'draft';
}
