// dto/create-brand.dto.ts
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { BrandStatus } from '../../../../generated/prisma/browser';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBrandDto {
  @ApiProperty({ example: 'AeroSound', minLength: 2, maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'aerosound', description: 'Unique kebab-case slug' })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be kebab-case alphanumeric',
  })
  slug: string;

  @ApiPropertyOptional({ example: 'https://aerosound.audio' })
  @IsOptional()
  @IsUrl()
  websiteUrl?: string;

  @ApiPropertyOptional({ example: 'Germany' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    example: 'Studio-grade wireless monitors.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ enum: BrandStatus, default: BrandStatus.ACTIVE })
  @IsOptional()
  @IsEnum(BrandStatus)
  status?: BrandStatus;

  @ApiPropertyOptional({ example: false, description: "'true' or 'false'" })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isInternal?: boolean;

  @ApiPropertyOptional({ example: 'contact@aerosound.audio' })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;
}
