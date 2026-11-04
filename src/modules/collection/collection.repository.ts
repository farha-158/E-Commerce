import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../../shared/db/database.service';

@Injectable()
export class CollectionsRepository {
  constructor(private readonly prisma: DatabaseService) {}

  create(data: Prisma.CollectionCreateInput) {
    return this.prisma.collection.create({ data });
  }

  findById(id: string) {
    return this.prisma.collection.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
  }

  findBySlug(slug: string) {
    return this.prisma.collection.findUnique({ where: { slug } });
  }

  findByName(name: string) {
    return this.prisma.collection.findUnique({ where: { name } });
  }

  findMany(params: {
    skip: number;
    take: number;
    where?: Prisma.CollectionWhereInput;
  }) {
    const { skip, take, where } = params;
    return this.prisma.$transaction([
      this.prisma.collection.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        include: { _count: { select: { products: true } } },
      }),
      this.prisma.collection.count({ where }),
    ]);
  }

  update(id: string, data: Prisma.CollectionUpdateInput) {
    return this.prisma.collection.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.collection.delete({ where: { id } });
  }
}
