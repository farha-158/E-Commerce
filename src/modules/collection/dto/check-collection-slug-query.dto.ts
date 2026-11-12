import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class CheckCollectionSlugQueryDto {
  @ApiProperty({ example: 'best-sellers-2025' })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be kebab-case alphanumeric',
  })
  slug: string;
}
