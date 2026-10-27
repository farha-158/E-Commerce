import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/browser';

@Injectable()
export abstract class TransactionPort {
  abstract run<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
