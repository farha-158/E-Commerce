import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { Match } from '../decorator/match.decorator';

export class ResetPasswordDto {
  @ApiProperty({})
  @IsEmail()
  email: string;

  @ApiProperty({})
  @IsString()
  @Length(6, 6)
  otp: string;

  @ApiProperty({ minLength: 8, maxLength: 36 })
  @Length(8, 36)
  newPassword: string;

  @ApiProperty({})
  @IsString()
  @IsNotEmpty()
  @Match('newPassword', {
    message: 'Password confirmation does not match the entered password',
  })
  confirmNewPassword: string;
}
