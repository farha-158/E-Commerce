import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../shared/db/database.service';
import { Prisma } from '../../../generated/prisma/browser';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: DatabaseService) {}

  findByEmail(email: string,tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.user.findUnique({ where: { email } });
  }

  findById(id: string,tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.user.findUnique({ where: { id } });
  }

  create(data: Prisma.UserCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.user.create({ data });
  }

  update(
    id: string,
    data: Prisma.UserUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.user.update({ where: { id }, data });
  }
}
