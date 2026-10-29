import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OtpType, Prisma } from '../../../generated/prisma/browser';
import * as bcrypt from 'bcrypt';
import {
  createHash,
  createHmac,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from 'crypto';
import { UserRole } from '../../../generated/prisma/enums';
import { RegisterDto } from './dto/register.dto';
import { UserRepository } from '../user/user.repository';
import { TransactionPort } from '../../shared/db/transaction/transaction.port';
import { OtpRepository } from './repository/otp.repository';
import { EmailOutboxRepository } from '../outbox/outbox.repository';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from '../../shared/interfaces/jwt-payload.interface';
import { StringValue } from 'ms';
import { EmailDto } from './dto/email.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  /**
   * A real bcrypt hash (same cost as production hashes) that `login` compares against
   * when the email doesn't exist, so response time doesn't reveal whether an account exists.
   */
  private readonly dummyHash = bcrypt.hashSync(
    'dummy-password-for-timing',
    BCRYPT_ROUNDS,
  );

  constructor(
    private readonly transaction: TransactionPort,
    private readonly userRepo: UserRepository,
    private readonly otpRepo: OtpRepository,
    private readonly emailOutboxRepo: EmailOutboxRepository,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ================= Register / Verify =================

  /**
   * Registers a new user, or refreshes the details of an existing *unverified* one,
   * then queues a verification OTP email.
   *
   * The user write, the OTP and the outbox row are saved in ONE transaction, so an
   * email is never lost or sent for a user that failed to save.
   *
   * @throws ConflictException if the email already belongs to a verified account.
   */
  async register(dto: RegisterDto) {
    const { name, email, phone, password } = dto;
    const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);

    await this.transaction.run(async (tx) => {
      const existing = await this.userRepo.findByEmail(email, tx);

      if (existing?.isVerified)
        throw new ConflictException('Email already registered');

      const user = existing
        ? await this.userRepo.update(
            existing.id,
            { name, phone, password_hash: hashed },
            tx,
          )
        : await this.userRepo.create(
            { name, email, phone, password_hash: hashed },
            tx,
          );

      await this.queueOtp(tx, user.id, OtpType.VERIFY_EMAIL, user.email);
    });

    return {
      message: 'Registered. Check your email for the verification code.',
    };
  }

  /**
   * Verifies the user's email with the OTP, marks the account as verified and
   * logs the user in (returns an access + refresh token pair).
   *
   * OTP consumption and the `isVerified` update share one transaction: if the
   * update fails, the code is not burned.
   *
   * Unknown and already-verified emails get the same error as a wrong code,
   * so this endpoint can't be used to discover registered emails.
   *
   * @throws BadRequestException on any invalid, expired or already-used code.
   */
  async verifyEmail({ email, otp }: VerifyEmailDto) {
    const user = await this.userRepo.findByEmail(email);

    if (!user) throw new BadRequestException('Invalid or expired code');

    await this.transaction.run(async (tx) => {
      await this.consumeOtp(user.id, OtpType.VERIFY_EMAIL, otp, tx);
      await this.userRepo.update(user.id, { isVerified: true }, tx);
    });

    const tokens = await this.issueTokens(user.id, user.role);
    return {
      message: 'Email verified',
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    };
  }

  /**
   * Sends a fresh verification code to an unverified account.
   * Always returns the same message (even if the account doesn't exist
   * or the resend cooldown is active) to prevent email enumeration.
   */
  async resendVerification({ email }: EmailDto) {
    const user = await this.userRepo.findByEmail(email);

    if (user?.isVerified) return { message: 'Email already verified' };

    if (user && !user.isVerified)
      await this.safeQueue(email, OtpType.VERIFY_EMAIL, user.id);

    return { message: 'If the account exists, a new code has been sent.' };
  }

  // ================= Login / Tokens =================

  /**
   * Authenticates by email + password and returns an access + refresh token pair.
   *
   * A bcrypt comparison always runs (against `dummyHash` when the user is missing)
   * so timing doesn't leak whether the email exists.
   *
   * @throws UnauthorizedException on wrong email or password (same message for both).
   * @throws ForbiddenException if the credentials are right but the email isn't verified.
   */
  async login({ email, password }: LoginDto) {
    const user = await this.userRepo.findByEmail(email);
    const ok = await bcrypt.compare(
      password,
      user?.password_hash ?? this.dummyHash,
    );

    if (!user || !ok)
      throw new UnauthorizedException('Invalid email or password');

    if (!user.isVerified)
      throw new ForbiddenException('Please verify your email first');
    const tokens =await this.issueTokens(user.id, user.role)
    return {
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    }; ;
  }

  /**
   * Issues a new access token for a valid refresh token.
   * The refresh token itself is NOT rotated and stays valid until it expires.
   *
   * The role is read fresh from the database, so role changes apply on the next refresh.
   *
   * @throws UnauthorizedException if the token doesn't match the stored hash
   * (logged out, or replaced by a newer login). The stored session is cleared in that case.
   */
  async refresh(userId: string, refreshToken: string) {
    const user = await this.userRepo.findById(userId);
    if (
      !user?.refreshTokenHash ||
      user.refreshTokenHash !== this.sha256(refreshToken)
    ) {
      if (user) await this.userRepo.update(user.id, { refreshTokenHash: null });
      throw new UnauthorizedException('Invalid refresh token');
    }

    const accessToken = await this.signAccessToken(user.id, user.role);
    return { data: { accessToken } };
  }

  /** Ends the session by clearing the stored refresh-token hash. */
  async logout(userId: string) {
    await this.userRepo.update(userId, { refreshTokenHash: null });
    return true;
  }

  // ================= Forgot / Reset =================

  /**
   * Starts a password reset by queueing a reset OTP email.
   *
   * Always returns the same message whether or not the email exists, so it can't
   * be used to discover registered emails. Unverified accounts also get a code:
   * a successful reset proves email ownership (see `resetPassword`).
   */
  async forgotPassword({ email }: EmailDto) {
    const user = await this.userRepo.findByEmail(email);

    if (user) await this.safeQueue(email, OtpType.RESET_PASSWORD, user.id);

    return { message: 'If the email exists, a reset code has been sent.' };
  }

  /**
   * Sets a new password using the reset OTP.
   *
   * In one transaction: consumes the OTP, saves the new password, clears the
   * refresh token (logs out every session) and marks the account verified,
   * since having the code proves the user controls the email.
   *
   * @throws BadRequestException on any invalid, expired or already-used code.
   */
  async resetPassword({ email, otp, newPassword }: ResetPasswordDto) {
    const user = await this.userRepo.findByEmail(email);

    if (!user) throw new BadRequestException('Invalid or expired code');

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS); // before the tx

    await this.transaction.run(async (tx) => {
      await this.consumeOtp(user.id, OtpType.RESET_PASSWORD, otp, tx);
      await this.userRepo.update(
        user.id,
        {
          password_hash: passwordHash,
          refreshTokenHash: null,
          isVerified: true,
        },
        tx,
      );
    });

    return true;
  }

  // ================= Helpers =================

  private signAccessToken(userId: string, role: UserRole) {
    const payload: JwtPayload = { sub: userId, role };
    return this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES') as StringValue,
    });
  }

  private signRefreshToken(userId: string) {
    return this.jwt.signAsync(
      { sub: userId },
      {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES') as StringValue,
        jwtid: randomUUID(),
      },
    );
  }

  private async issueTokens(userId: string, role: UserRole) {
    const [accessToken, refreshToken] = await Promise.all([
      this.signAccessToken(userId, role),
      this.signRefreshToken(userId),
    ]);

    await this.userRepo.update(userId, {
      refreshTokenHash: this.sha256(refreshToken),
    });

    return { accessToken, refreshToken };
  }

  private async queueOtp(
    tx: Prisma.TransactionClient,
    userId: string,
    type: OtpType,
    email: string,
  ) {
    const existing = await this.otpRepo.findByUserIdAndType(userId, type);

    if (
      existing &&
      Date.now() - existing.createdAt.getTime() < OTP_COOLDOWN_MS
    ) {
      throw new HttpException(
        'Please wait before requesting a new code',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = randomInt(100000, 1000000).toString();

    await this.otpRepo.upsert(
      userId,
      type,
      {
        codeHash: this.hmac(code),
        attempts: 0,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
      tx,
    );

    await this.emailOutboxRepo.create({ type, payload: { email, code } }, tx);
  }

  private async safeQueue(email: string, type: OtpType, userId: string) {
    try {
      await this.transaction.run((tx) =>
        this.queueOtp(tx, userId, type, email),
      );
    } catch (e) {
      if (!(
        e instanceof HttpException &&
        e.getStatus() === HttpStatus.TOO_MANY_REQUESTS
      ))
        throw e;
    }
  }

  private async consumeOtp(
    userId: string,
    type: OtpType,
    code: string,
    tx?: Prisma.TransactionClient,
  ) {
    const invalid = new BadRequestException('Invalid or expired code');

    const otp = await this.otpRepo.findByUserIdAndType(userId, type);
    if (!otp) throw invalid;

    if (
      otp.expiresAt.getTime() < Date.now() ||
      otp.attempts >= OTP_MAX_ATTEMPTS
    ) {
      await this.otpRepo.deleteById(otp.id);
      throw invalid;
    }

    const a = Buffer.from(this.hmac(code));
    const b = Buffer.from(otp.codeHash);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      await this.otpRepo.incrementAttempts(otp.id);
      throw invalid;
    }

    const { count } = await this.otpRepo.deleteById(otp.id, tx);
    if (count === 0) throw invalid;
  }

  private sha256(v: string) {
    return createHash('sha256').update(v).digest('hex');
  }

  private hmac(v: string) {
    return createHmac('sha256', this.config.getOrThrow('OTP_SECRET'))
      .update(v)
      .digest('hex');
  }
}
