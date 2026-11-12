// dto/create-collection.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CollectionDisplayLocation, CollectionStatus } from '../../../../generated/prisma/browser';
import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const toStringArray = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('[')) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return value;
      }
    }
    return [trimmed];
  }
  return value;
};

export class CreateCollectionDto {
  @ApiProperty({ example: 'Best Sellers 2025', minLength: 3, maxLength: 120 })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title: string;

  @ApiProperty({
    example: 'best-sellers-2025',
    description: 'Unique kebab-case slug',
  })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be kebab-case alphanumeric',
  })
  slug: string;

  @ApiPropertyOptional({
    example: 'Top velocity SKUs with highest customer ratings.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    enum: CollectionDisplayLocation,
    default: CollectionDisplayLocation.STOREFRONT_CATALOG,
  })
  @IsOptional()
  @IsEnum(CollectionDisplayLocation)
  displayLocation?: CollectionDisplayLocation;

  @ApiPropertyOptional({
    enum: CollectionStatus,
    default: CollectionStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(CollectionStatus)
  status?: CollectionStatus;

  @ApiPropertyOptional({ example: false, description: "'true' or 'false'" })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ example: 'TOP VELOCITY' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  badgeText?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['prod-1', 'prod-2'],
    description: 'Initial product IDs to include in this collection',
  })
  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  productIds?: string[];
}
