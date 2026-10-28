import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import { OtpType } from '../../../generated/prisma/enums';

const OTP_EXPIRES_MINUTES = 10;

const OTP_EMAILS: Record<
  OtpType,
  { subject: string; template: string; title: string; intro: string }
> = {
  [OtpType.VERIFY_EMAIL]: {
    subject: 'Verify your email',
    template: 'verify-email',
    title: 'Verify your email',
    intro: 'Use this code to verify your email address:',
  },
  [OtpType.RESET_PASSWORD]: {
    subject: 'Reset your password',
    template: 'reset-password',
    title: 'Reset your password',
    intro: 'Use this code to reset your password:',
  },
};

@Injectable()
export class MailService {
  constructor(
    private readonly mailer: MailerService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Sends an OTP email rendered from the EJS template that matches `type`.
   * Throws if sending fails; the outbox worker catches that and retries.
   */
  async sendOtp(to: string, code: string, type: OtpType): Promise<void> {
    const { subject, template, title, intro } = OTP_EMAILS[type];
    const appName = this.config.get<string>('APP_NAME', 'E-Commerce');

    await this.mailer.sendMail({
      to,
      subject,
      template,
      context: {
        title,
        intro,
        code,
        email: to,
        appName,
        expiresMinutes: OTP_EXPIRES_MINUTES,
        year: new Date().getFullYear(),
      },
      text: `${intro} ${code}\n\nThis code expires in ${OTP_EXPIRES_MINUTES} minutes. If you didn't request it, ignore this email.`,
    });
  }
}
