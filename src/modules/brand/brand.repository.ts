import { Injectable } from '@nestjs/common';
import { BrandStatus, Prisma } from '../../../generated/prisma/browser';
import { DatabaseService } from '../../shared/db/database.service';

@Injectable()
export class BrandsRepository {
  constructor(private readonly prisma: DatabaseService) {}

  create(data: Prisma.BrandCreateInput) {
    return this.prisma.brand.create({
      data,
      include: { _count: { select: { products: true } } },
    });
  }

  findBySlug(slug: string) {
    return this.prisma.brand.findUnique({ where: { slug } });
  }

  findById(id: string) {
    return this.prisma.brand.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
  }

  findAllPaginated(params: {
    where: Prisma.BrandWhereInput;
    orderBy: Prisma.BrandOrderByWithRelationInput;
    skip: number;
    take: number;
  }) {
    const { where, orderBy, skip, take } = params;

    return this.prisma.$transaction([
      this.prisma.brand.findMany({
        where,
        orderBy,
        skip,
        take,
        include: { _count: { select: { products: true } } },
      }),
      this.prisma.brand.count({ where }),
    ]);
  }

  getMetrics() {
    return this.prisma.$transaction([
      this.prisma.brand.count(),
      this.prisma.brand.count({ where: { status: 'ACTIVE' } }),
      this.prisma.brand.count({ where: { isInternal: true } }),
      this.prisma.product.count({ where: { brandId: { not: null } } }),
    ]);
  }

  async slugExists(slug: string): Promise<boolean> {
    const count = await this.prisma.brand.count({ where: { slug } });
    return count > 0;
  }

  update(id: string, data: Prisma.BrandUpdateInput) {
    return this.prisma.brand.update({
      where: { id },
      data,
      include: { _count: { select: { products: true } } },
    });
  }

  findBySlugExcludingId(slug: string, id: string) {
    return this.prisma.brand.findFirst({
      where: { slug, id: { not: id } },
    });
  }

  deleteAndDetachProducts(id: string) {
    return this.prisma.$transaction([
      this.prisma.product.updateMany({
        where: { brandId: id },
        data: { brandId: null },
      }),
      this.prisma.brand.delete({ where: { id } }),
    ]);
  }

  updateManyStatus(ids: string[], status: BrandStatus) {
    return this.prisma.brand.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });
  }

  findManyByIds(ids: string[]) {
    return this.prisma.brand.findMany({
      where: { id: { in: ids } },
      select: { id: true, logoUrl: true },
    });
  }

  deleteManyAndDetachProducts(ids: string[]) {
    return this.prisma.$transaction([
      this.prisma.product.updateMany({
        where: { brandId: { in: ids } },
        data: { brandId: null },
      }),
      this.prisma.brand.deleteMany({ where: { id: { in: ids } } }),
    ]);
  }
}
