import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  DimensionUnit,
  OutOfStockPolicy,
  ProductStatus,
  WeightUnit,
} from '../../../../generated/prisma/enums';

// ── Transformers ──

const toUpper = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

const toNumber = ({ value }: { value: unknown }) => {
  if (value === '' || value === null || value === undefined) {
    return undefined;
  }

  return Number(value);
};

const toBoolean = ({ value }: { value: unknown }) => {
  if (value === 'true') return true;
  if (value === 'false') return false;

  return value;
};

const parseJson = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();

  if (!trimmed) return value;

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
};

const price = { maxDecimalPlaces: 2 };

// ── Color Option ──

export class ColorOptionDto {
  @ApiProperty({ example: 'Midnight Black', maxLength: 60 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  label: string;

  @ApiProperty({
    example: '#000000',
    description: 'HEX color code',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, {
    message: 'colorHex must be a valid hex color',
  })
  colorHex: string;
}

// ── Care Option ──

export class CareOptionDto {
  @ApiProperty({ example: 'Premium Care' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  label: string;

  @ApiProperty({ example: 15.5, minimum: 0 })
  @Transform(toNumber)
  @IsNumber(price)
  @Min(0)
  extraPrice: number;
}

// ── Variant ──

export class VariantDto {
  @ApiProperty({ example: 'Black - Large' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'HEADPHONE-BLK-L' })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ example: 199.99, minimum: 0 })
  @Transform(toNumber)
  @IsNumber(price)
  @Min(0)
  price: number;

  @ApiProperty({ example: 50, minimum: 0 })
  @Transform(toNumber)
  @IsInt()
  @Min(0)
  stock: number;

  @ApiPropertyOptional({ example: true, default: true })
  @Transform(toBoolean)
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'Midnight Black' })
  @IsOptional()
  @IsString()
  colorLabel?: string;

  @ApiPropertyOptional({ example: 'Premium Care' })
  @IsOptional()
  @IsString()
  careLabel?: string;
}

// ── Create Product ──

export class CreateProductDto {
  // ── Basic Information ──

  @ApiProperty({ example: 'AeroSound Studio Headphones', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'aerosound-studio-headphones' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase kebab-case',
  })
  slug: string;

  @ApiPropertyOptional({ example: 'Professional wireless headphones' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  subtitle?: string;

  @ApiPropertyOptional({ example: '<p>Product description</p>' })
  @IsOptional()
  @IsString()
  descriptionHtml?: string;

  @ApiPropertyOptional({ example: false })
  @Transform(toBoolean)
  @IsOptional()
  @IsBoolean()
  has3dAsset?: boolean;

  // ── Pricing ──

  @ApiProperty({ example: 199.99, minimum: 0 })
  @Transform(toNumber)
  @IsNumber(price)
  @Min(0)
  basePrice: number;

  @ApiPropertyOptional({ example: 249.99, minimum: 0 })
  @Transform(toNumber)
  @IsOptional()
  @IsNumber(price)
  @Min(0)
  comparePrice?: number;

  @ApiPropertyOptional({ example: 120.5, minimum: 0 })
  @Transform(toNumber)
  @IsOptional()
  @IsNumber(price)
  @Min(0)
  costPrice?: number;

  @ApiPropertyOptional({ example: true })
  @Transform(toBoolean)
  @IsOptional()
  @IsBoolean()
  chargeTax?: boolean;

  @ApiPropertyOptional({ example: 'tax-profile-123' })
  @IsOptional()
  @IsString()
  taxProfileId?: string;

  // ── Inventory ──

  @ApiProperty({ example: 'AERO-HEADPHONE-001' })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiPropertyOptional({ example: '1234567890123' })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional({ example: 100, minimum: 0 })
  @Transform(toNumber)
  @IsOptional()
  @IsInt()
  @Min(0)
  stockCount?: number;

  @ApiPropertyOptional({ example: 10, minimum: 0 })
  @Transform(toNumber)
  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;

  @ApiPropertyOptional({ enum: OutOfStockPolicy })
  @IsOptional()
  @Transform(toUpper)
  @IsEnum(OutOfStockPolicy)
  outOfStockPolicy?: OutOfStockPolicy;

  @ApiPropertyOptional({ example: true })
  @Transform(toBoolean)
  @IsOptional()
  @IsBoolean()
  hasVariants?: boolean;

  // ── Color Options ──

  @ApiPropertyOptional({
    type: [ColorOptionDto],
    example: [{ label: 'Black', colorHex: '#000000' }],
    maxItems: 50,
  })
  @Transform(parseJson)
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ColorOptionDto)
  colorOptions?: ColorOptionDto[];

  // ── Care Options ──

  @ApiPropertyOptional({
    type: [CareOptionDto],
    example: [{ label: 'Premium Care', extraPrice: 15.5 }],
    maxItems: 50,
  })
  @Transform(parseJson)
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CareOptionDto)
  careOptions?: CareOptionDto[];

  // ── Variants ──

  @ApiPropertyOptional({
    type: [VariantDto],
    example: [
      {
        title: 'Black - Large',
        sku: 'HEADPHONE-BLK-L',
        price: 199.99,
        stock: 50,
        isActive: true,
        colorLabel: 'Black',
        careLabel: 'Premium Care',
      },
    ],
    maxItems: 200,
  })
  @Transform(parseJson)
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  variants?: VariantDto[];

  // ── Shipping & Dimensions ──

  @ApiPropertyOptional({ example: 1.5, minimum: 0 })
  @Transform(toNumber)
  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @ApiPropertyOptional({ enum: WeightUnit, example: WeightUnit.KG })
  @IsOptional()
  @Transform(toUpper)
  @IsEnum(WeightUnit)
  weightUnit?: WeightUnit;

  @ApiPropertyOptional({ example: 20, minimum: 0 })
  @Transform(toNumber)
  @IsOptional()
  @IsNumber()
  @Min(0)
  length?: number;

  @ApiPropertyOptional({ example: 15, minimum: 0 })
  @Transform(toNumber)
  @IsOptional()
  @IsNumber()
  @Min(0)
  width?: number;

  @ApiPropertyOptional({ example: 10, minimum: 0 })
  @Transform(toNumber)
  @IsOptional()
  @IsNumber()
  @Min(0)
  height?: number;

  @ApiPropertyOptional({ enum: DimensionUnit, example: DimensionUnit.CM })
  @IsOptional()
  @Transform(toUpper)
  @IsEnum(DimensionUnit)
  dimensionUnit?: DimensionUnit;

  @ApiPropertyOptional({ example: '85183000' })
  @IsOptional()
  @IsString()
  hsCode?: string;

  @ApiPropertyOptional({ example: 'shipping-profile-123' })
  @IsOptional()
  @IsString()
  shippingProfileId?: string;

  // ── Product Settings ──

  @ApiPropertyOptional({ enum: ProductStatus, example: ProductStatus.DRAFT })
  @IsOptional()
  @Transform(toUpper)
  @IsEnum(ProductStatus)
  productStatus?: ProductStatus;

  @ApiPropertyOptional({ example: 'NEW', maxLength: 40 })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  cornerRibbon?: string;

  @ApiPropertyOptional({ example: true })
  @Transform(toBoolean)
  @IsOptional()
  @IsBoolean()
  allowPhotoReviews?: boolean;

  @ApiPropertyOptional({ example: false })
  @Transform(toBoolean)
  @IsOptional()
  @IsBoolean()
  featureInSpotlight?: boolean;

  // ── Relations ──

  @ApiProperty({ example: 'category-123' })
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @ApiPropertyOptional({ example: 'brand-123' })
  @IsOptional()
  @IsString()
  brandId?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['collection-123', 'collection-456'],
  })
  @Transform(parseJson)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  collectionIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['electronics', 'wireless'],
  })
  @Transform(parseJson)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['High quality audio', 'Long battery life'],
  })
  @Transform(parseJson)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customerHighlights?: string[];
}
