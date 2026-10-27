import { Injectable } from '@nestjs/common';
import { TransactionPort } from './transaction.port';
import { DatabaseService } from '../database.service';
import { TransactionClient } from '../../../../generated/prisma/internal/prismaNamespace';

@Injectable()
export class TransactionService implements TransactionPort {
  constructor(private readonly prisma: DatabaseService) {}

  run<T>(fn: (tx: TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction((tx) => fn(tx));
  }
}
