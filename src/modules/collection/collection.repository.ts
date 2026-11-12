import { Injectable } from '@nestjs/common';
import { CollectionStatus, Prisma } from '../../../generated/prisma/browser';
import { DatabaseService } from '../../shared/db/database.service';

@Injectable()
export class CollectionsRepository {
  constructor(private readonly prisma: DatabaseService) {}

  findBySlug(slug: string) {
    return this.prisma.collection.findUnique({ where: { slug } });
  }

  create(
    data: Omit<Prisma.CollectionCreateInput, 'products'>,
    productIds: string[] = [],
  ) {
    return this.prisma.collection.create({
      data: {
        ...data,
        products: {
          create: productIds.map((productId, index) => ({
            product: { connect: { id: productId } },
            position: index,
          })),
        },
      },
      include: { _count: { select: { products: true } } },
    });
  }

  findById(id: string) {
    return this.prisma.collection.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true } },
        products: {
          orderBy: [{ position: 'asc' }, { addedAt: 'asc' }],
          select: {
            product: {
              select: {
                id: true,
                title: true,
                sku: true,
                basePrice: true,
                media: true,
              },
            },
          },
        },
      },
    });
  }

  findAllPaginated(params: {
    where: Prisma.CollectionWhereInput;
    orderBy: Prisma.CollectionOrderByWithRelationInput[];
    skip: number;
    take: number;
  }) {
    const { where, orderBy, skip, take } = params;

    return this.prisma.$transaction([
      this.prisma.collection.findMany({
        where,
        orderBy,
        skip,
        take,
        include: { _count: { select: { products: true } } },
      }),
      this.prisma.collection.count({ where }),
    ]);
  }

  getMetrics() {
    return this.prisma.$transaction([
      this.prisma.collection.count(),
      this.prisma.collection.count({ where: { status: 'ACTIVE' } }),
      this.prisma.collection.count({ where: { isFeatured: true } }),
      this.prisma.collectionProduct.findMany({
        distinct: ['productId'],
        select: { productId: true },
      }),
    ]);
  }

  async slugExists(slug: string): Promise<boolean> {
    const count = await this.prisma.collection.count({ where: { slug } });
    return count > 0;
  }

  findBySlugExcludingId(slug: string, id: string) {
    return this.prisma.collection.findFirst({
      where: { slug, id: { not: id } },
    });
  }

  update(
    id: string,
    data: Omit<Prisma.CollectionUpdateInput, 'products'>,
    productIds?: string[],
  ) {
    return this.prisma.collection.update({
      where: { id },
      data: {
        ...data,
        ...(productIds && {
          products: {
            deleteMany: {},
            create: productIds.map((productId, index) => ({
              product: { connect: { id: productId } },
              position: index,
            })),
          },
        }),
      },
      include: { _count: { select: { products: true } } },
    });
  }

  delete(id: string) {
    return this.prisma.collection.delete({ where: { id } });
  }

  updateManyStatus(ids: string[], status: CollectionStatus) {
    return this.prisma.collection.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });
  }

  findManyByIds(ids: string[]) {
    return this.prisma.collection.findMany({
      where: { id: { in: ids } },
      select: { id: true, imageUrl: true },
    });
  }

  deleteMany(ids: string[]) {
    return this.prisma.collection.deleteMany({ where: { id: { in: ids } } });
  }

  findExistingId(id: string) {
    return this.prisma.collection.findUnique({
      where: { id },
      select: { id: true },
    });
  }

  findLinkedProductIds(collectionId: string) {
    return this.prisma.collectionProduct.findMany({
      where: { collectionId },
      select: { productId: true },
    });
  }

  getMaxPosition(collectionId: string) {
    return this.prisma.collectionProduct.aggregate({
      where: { collectionId },
      _max: { position: true },
    });
  }

  addProducts(
    collectionId: string,
    productIds: string[],
    startPosition: number,
  ) {
    return this.prisma.collectionProduct.createMany({
      data: productIds.map((productId, index) => ({
        collectionId,
        productId,
        position: startPosition + index,
      })),
      skipDuplicates: true,
    });
  }

  removeProducts(collectionId: string, productIds: string[]) {
    return this.prisma.collectionProduct.deleteMany({
      where: { collectionId, productId: { in: productIds } },
    });
  }

  setProducts(collectionId: string, productIds: string[]) {
    return this.prisma.$transaction([
      this.prisma.collectionProduct.deleteMany({ where: { collectionId } }),
      this.prisma.collectionProduct.createMany({
        data: productIds.map((productId, index) => ({
          collectionId,
          productId,
          position: index,
        })),
      }),
    ]);
  }

  countProducts(collectionId: string) {
    return this.prisma.collectionProduct.count({ where: { collectionId } });
  }
}
