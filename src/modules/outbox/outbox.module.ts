import { Module } from '@nestjs/common';
import { OutboxWorker } from './outbox.worker';
import { MailModule } from '../../shared/mail/mail.module';
import { EmailOutboxRepository } from './outbox.repository';

@Module({
  imports: [MailModule],
  providers: [OutboxWorker, EmailOutboxRepository],
  exports: [EmailOutboxRepository],
})
export class OutboxModule {}
