import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../shared/db/database.service';
import { Prisma } from '../../../generated/prisma/browser';

const FULL_INCLUDE = {
  media: { orderBy: { position: 'asc' } },
  colorOptions: true,
  careOptions: true,
  variants: true,
  collections: {
    include: { collection: { select: { id: true, name: true, slug: true } } },
  },
  category: { select: { id: true, name: true, slug: true } },
  brand: true,
  taxProfile: true,
  shippingProfile: true,
} satisfies Prisma.ProductInclude;

@Injectable()
export class ProductsRepository {
  constructor(private readonly prisma: DatabaseService) {}

  create(data: Prisma.ProductCreateInput) {
    return this.prisma.product.create({
      data,
    });
  }

  // ───── Read ─────
  findById(id: string) {
    return this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: FULL_INCLUDE,
    });
  }

  async findAll(
    where: Prisma.ProductWhereInput,
    orderBy: Prisma.ProductOrderByWithRelationInput,
    skip: number,
    take: number,
  ) {
    const [products, totalItems] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          brand: {
            select: {
              id: true,
              name: true,
            },
          },
          variants: {
            select: {
              id: true,
              sku: true,
              price: true,
              stock: true,
              isActive: true,
            },
          },
          media: {
            orderBy: {
              position: 'asc',
            },
          },
        },
      }),

      this.prisma.product.count({ where }),
    ]);

    return { products, totalItems };
  }

  async getCatalogMetrics() {
    const [totalProducts, publishedCount, lowStockCount, draftCount] =
      await Promise.all([
        this.prisma.product.count({
          where: {
            deletedAt: null,
          },
        }),

        this.prisma.product.count({
          where: {
            deletedAt: null,
            status: 'PUBLISHED',
          },
        }),

        this.prisma.product.count({
          where: {
            deletedAt: null,
            stockCount: {
              gt: 0,
              lte: this.prisma.product.fields.lowStockThreshold,
            },
          },
        }),

        this.prisma.product.count({
          where: {
            deletedAt: null,
            status: 'DRAFT',
          },
        }),
      ]);

    return {
      totalProducts,
      publishedCount,
      lowStockCount,
      draftCount,
    };
  }

  async checkSlugAvailability(slug: string) {
    return this.prisma.product.findUnique({
      where: { slug },
      select: { id: true },
    });
  }

  async checkSkuAvailability(sku: string) {
    return this.prisma.product.findUnique({
      where: { sku },
      select: { id: true },
    });
  }

  async update(id: string, data: Prisma.ProductUpdateInput) {
    return this.prisma.product.update({
      where: { id },
      data,
      select: {
        id: true,
        updatedAt: true,
      },
    });
  }

  softDelete(id: string) {
    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
