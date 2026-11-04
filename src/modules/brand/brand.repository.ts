import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../../shared/db/database.service';

@Injectable()
export class BrandsRepository {
  constructor(private readonly prisma: DatabaseService) {}

  create(data: Prisma.BrandCreateInput) {
    return this.prisma.brand.create({ data });
  }

  findById(id: string) {
    return this.prisma.brand.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
  }

  findByName(name: string) {
    return this.prisma.brand.findUnique({ where: { name } });
  }

  findMany(params: {
    skip: number;
    take: number;
    where?: Prisma.BrandWhereInput;
  }) {
    const { skip, take, where } = params;
    return this.prisma.$transaction([
      this.prisma.brand.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        include: { _count: { select: { products: true } } },
      }),
      this.prisma.brand.count({ where }),
    ]);
  }

  update(id: string, data: Prisma.BrandUpdateInput) {
    return this.prisma.brand.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.brand.delete({ where: { id } });
  }
}
