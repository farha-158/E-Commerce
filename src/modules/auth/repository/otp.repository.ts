import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../shared/db/database.service';
import { OtpType, Prisma } from '../../../../generated/prisma/browser';

@Injectable()
export class OtpRepository {
  constructor(private readonly prisma: DatabaseService) {}

  upsert(
    userId: string,
    type: OtpType,
    data: {
      codeHash: string;
      attempts: number;
      createdAt: Date;
      expiresAt: Date;
    },
    tx: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;

    return client.otp.upsert({
      where: { userId_type: { userId, type } },
      create: { userId, type, ...data },
      update: data,
    });
  }

  findByUserIdAndType(userId: string, type: OtpType) {
    return this.prisma.otp.findUnique({
      where: { userId_type: { userId, type } },
    });
  }

  incrementAttempts(id: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).otp.updateMany({
      where: { id },
      data: { attempts: { increment: 1 } },
    });
  }

  deleteById(id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.otp.deleteMany({ where: { id } });
  }

  deleteMany(){
    return this.prisma.otp.deleteMany({ where: { expiresAt: { lt: new Date() } } })
  }
}
