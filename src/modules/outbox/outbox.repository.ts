import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../shared/db/database.service';
import { OtpType, OutboxStatus, Prisma } from '../../../generated/prisma/browser';

export type EmailPayload = { email: string; code: string };

export type ClaimedEmail = {
  id: string;
  type: OtpType;
  payload: EmailPayload | null;
  attempts: number;
};

@Injectable()
export class EmailOutboxRepository {
  constructor(private readonly prisma: DatabaseService) {}

  create(data: Prisma.EmailOutboxCreateInput, tx: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.emailOutbox.create({ data });
  }

  claimBatch(limit: number, leaseSeconds: number) {
    return this.prisma.$queryRaw<ClaimedEmail[]>`
      UPDATE email_outbox
      SET status = 'PROCESSING',
          "nextAttemptAt" = now() + (${leaseSeconds}::int * interval '1 second')
      WHERE id IN (
        SELECT id FROM email_outbox
        WHERE status IN ('PENDING', 'PROCESSING')
          AND "nextAttemptAt" <= now()
        ORDER BY "createdAt"
        LIMIT ${limit}::int
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id, type, payload, attempts`;
  }

  markSent(id: string) {
    return this.prisma.emailOutbox.update({
      where: { id },
      data: {
        status: OutboxStatus.SENT,
        sentAt: new Date(),
        payload: Prisma.DbNull,
        lastError: null,
      },
    });
  }

  markRetry(
    id: string,
    attempts: number,
    nextAttemptAt: Date,
    lastError: string,
  ) {
    return this.prisma.emailOutbox.update({
      where: { id },
      data: {
        status: OutboxStatus.PENDING,
        attempts,
        nextAttemptAt,
        lastError,
      },
    });
  }

  markFailed(id: string, attempts: number, lastError: string) {
    return this.prisma.emailOutbox.update({
      where: { id },
      data: {
        status: OutboxStatus.FAILED,
        attempts,
        lastError,
        payload: Prisma.DbNull,
      },
    });
  }

  deleteSentBefore(date: Date) {
    return this.prisma.emailOutbox.deleteMany({
      where: { status: OutboxStatus.SENT, sentAt: { lt: date } },
    });
  }

  deleteFailedBefore(date: Date) {
    return this.prisma.emailOutbox.deleteMany({
      where: { status: OutboxStatus.FAILED, createdAt: { lt: date } },
    });
  }
}
