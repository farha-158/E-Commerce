import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MailService } from '../../shared/mail/mail.service';
import { ClaimedEmail, EmailOutboxRepository } from './outbox.repository';

const BATCH_SIZE = 10;
const MAX_ATTEMPTS = 5;
/**
 * لازم تكون أكبر من أسوأ وقت لمعالجة الدفعة كلها (BATCH_SIZE × أقصى وقت إرسال).
 * لو خلصت قبل ما الدفعة تخلص، instance تاني ممكن ياخد نفس الصفوف ويتبعت إيميل مرتين.
 */
const LEASE_SECONDS = 120;
const BASE_DELAY_MS = 10_000; // 10s, 20s, 40s, 80s
const KEEP_SENT_DAYS = 7;
const KEEP_FAILED_DAYS = 30;

@Injectable()
export class OutboxWorker {
  private readonly logger = new Logger(OutboxWorker.name);
  private running = false;

  constructor(
    private readonly outboxRepo: EmailOutboxRepository,
    private readonly mail: MailService,
  ) {}

  @Cron('*/2 * * * * *')
  async processOutbox() {
    if (this.running) return;
    this.running = true;

    try {
      const rows = await this.outboxRepo.claimBatch(BATCH_SIZE, LEASE_SECONDS);

      for (const row of rows) {
        try {
          await this.deliver(row);
        } catch (e) {
          this.logger.error(
            `Outbox ${row.id}: failed to record result`,
            e as Error,
          );
        }
      }
    } catch (e) {
      this.logger.error('Outbox cycle failed', e as Error);
    } finally {
      this.running = false;
    }
  }

  private async deliver(row: ClaimedEmail) {
    const payload = row.payload;

    if (!payload?.email || !payload?.code) {
      this.logger.error(`Outbox ${row.id}: invalid payload`);
      await this.outboxRepo.markFailed(
        row.id,
        row.attempts + 1,
        'Invalid payload',
      );
      return;
    }

    try {
      await this.mail.sendOtp(payload.email, payload.code, row.type);
    } catch (e) {
      await this.handleFailure(row, e);
      return;
    }

    await this.outboxRepo.markSent(row.id);
  }

  private async handleFailure(row: ClaimedEmail, error: unknown) {
    const attempts = row.attempts + 1;
    const lastError = String(error).slice(0, 500);

    if (attempts >= MAX_ATTEMPTS) {
      this.logger.error(
        `Outbox ${row.id} failed permanently after ${attempts} attempts: ${lastError}`,
      );
      await this.outboxRepo.markFailed(row.id, attempts, lastError);
      return;
    }

    this.logger.warn(
      `Outbox ${row.id} failed (attempt ${attempts}): ${lastError}`,
    );
    const nextAttemptAt = new Date(
      Date.now() + BASE_DELAY_MS * 2 ** (attempts - 1),
    );
    await this.outboxRepo.markRetry(row.id, attempts, nextAttemptAt, lastError);
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanup() {
    const day = 24 * 60 * 60 * 1000;
    const [sent, failed] = await Promise.all([
      this.outboxRepo.deleteSentBefore(
        new Date(Date.now() - KEEP_SENT_DAYS * day),
      ),
      this.outboxRepo.deleteFailedBefore(
        new Date(Date.now() - KEEP_FAILED_DAYS * day),
      ),
    ]);
    if (sent.count || failed.count) {
      this.logger.log(
        `Cleanup: removed ${sent.count} sent and ${failed.count} failed emails`,
      );
    }
  }
}
