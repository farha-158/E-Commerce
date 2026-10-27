import { Module } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { TransactionPort } from './transaction/transaction.port';
import { TransactionService } from './transaction/transaction.service';

@Module({
  providers: [
    DatabaseService,
    { provide: TransactionPort, useClass: TransactionService },
  ],
  exports: [DatabaseService, TransactionPort],
})
export class DatabaseModule {}
