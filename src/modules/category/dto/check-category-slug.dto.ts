import { Transform } from 'class-transformer';
import { IsString, Matches, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckCategorySlugDto {
  @ApiProperty({
    description: 'Category slug to check for availability',
    example: 'smart-wearables',
    minLength: 2,
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @MinLength(2)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must contain lowercase letters, numbers, and hyphens only',
  })
  slug: string;
}
