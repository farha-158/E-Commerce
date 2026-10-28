import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiCreatedResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { EmailDto } from './dto/email.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAccessGuard, JwtRefreshGuard } from '../../shared/guards/jwt.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Response, CookieOptions, Request } from 'express';
import ms, { StringValue } from 'ms';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../../shared/interfaces/jwt-payload.interface';
import { access } from 'fs';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Create an account and email a verification code' })
  @ApiCreatedResponse({})
  @ApiConflictResponse({ description: 'Email or phone already in use' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('verify-email')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Verify email with the OTP; returns tokens (auto-login)',
  })
  @ApiOkResponse({})
  @ApiBadRequestResponse({ description: 'Invalid or expired code' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  async verifyEmail(
    @Res({ passthrough: true }) res: Response,
    @Body() dto: VerifyEmailDto,
  ) {
    const { refreshToken, ...result } = await this.auth.verifyEmail(dto);
    res.cookie('refresh_token', refreshToken, this.getCookieOptions());

    return {
      message: result.message,
      data: { accessToken: result.accessToken },
    };
  }

  @Post('resend-verification')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Resend the verification code (same response whether or not the account exists)',
  })
  @ApiOkResponse({})
  resend(@Body() dto: EmailDto) {
    return this.auth.resendVerification(dto);
  }

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Log in with email and password' })
  @ApiOkResponse({})
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  @ApiForbiddenResponse({ description: 'Email not verified' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  async login(
    @Res({ passthrough: true }) res: Response,
    @Body() dto: LoginDto,
  ) {
    const { refreshToken, ...result } = await this.auth.login(dto);
    res.cookie('refresh_token', refreshToken, this.getCookieOptions());

    return { data: { ...result } };
  }

  @Post('refresh')
  @HttpCode(200)
  @UseGuards(JwtRefreshGuard)
  @ApiBearerAuth('refresh-token')
  @ApiOperation({
    summary: 'Get a new token pair',
    description:
      'Send the **refresh token** in the Authorization header. The old refresh token becomes invalid (rotation).',
  })
  @ApiOkResponse({})
  @ApiUnauthorizedResponse({ description: 'Invalid or reused refresh token' })
  refresh(@CurrentUser() user: { userId: string; refreshToken: string }) {
    return this.auth.refresh(user.userId, user.refreshToken);
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Invalidate the current refresh token' })
  @ApiOkResponse({})
  @ApiUnauthorizedResponse()
  async logout(
    @CurrentUser('sub') userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.logout(userId);

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    });

    return { message: 'Logged out successfully' };
  }

  @Post('forgot-password')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Email a password-reset code (same response whether or not the account exists)',
  })
  @ApiOkResponse({})
  forgot(@Body() dto: EmailDto) {
    return this.auth.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Set a new password using the OTP; logs out all sessions',
  })
  @ApiOkResponse({})
  @ApiBadRequestResponse({ description: 'Invalid or expired code' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  async reset(
    @Body() dto: ResetPasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.resetPassword(dto);

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    });

    return { message: 'Password updated. Please log in.' };
  }

  @Get('me')
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Current user (example protected route)' })
  @ApiOkResponse({})
  @ApiUnauthorizedResponse()
  me(@CurrentUser() user: JwtPayload) {
    return { data: { user } };
  }

  private getCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: ms(
        this.config.getOrThrow<string>('JWT_REFRESH_EXPIRES') as StringValue,
      ),
    };
  }
}
