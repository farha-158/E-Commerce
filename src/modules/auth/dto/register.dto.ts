import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Match } from '../decorator/match.decorator';

export class RegisterDto {
  @ApiProperty({ minLength: 2, maxLength: 60 })
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name: string;

  @ApiProperty({})
  @IsEmail()
  email: string;

  @ApiProperty({})
  @IsString()
  phone: string;

  @ApiProperty({ minLength: 8, maxLength: 36 })
  @MinLength(8)
  @MaxLength(36)
  password: string;

  @ApiProperty({
    description: 'Must match the password field',
  })
  @IsString()
  @Match('password', {
    message: 'Password confirmation does not match the entered password',
  })
  confirmPassword: string;
}
