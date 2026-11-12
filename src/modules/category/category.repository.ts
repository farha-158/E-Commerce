// categories.repository.ts
import { Injectable } from '@nestjs/common';
import {
  CategoryStatus,
  Prisma,
  ProductStatus,
} from '../../../generated/prisma/browser';
import { DatabaseService } from './../../shared/db/database.service';
import { TransactionPort } from '../../shared/db/transaction/transaction.port';

@Injectable()
export class CategoriesRepository {
  constructor(
    private readonly prisma: DatabaseService,
    private readonly transaction: TransactionPort,
  ) {}

  async getCategoriesKpis() {
    const now = new Date();

    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;

    const quarterStart = new Date(now.getFullYear(), quarterStartMonth, 1);

    const [
      totalCategories,
      newThisQuarter,
      activeDisplay,
      publishedProducts,
      featuredCategoriesCount,
    ] = await Promise.all([
      this.prisma.category.count({
        where: {
          deletedAt: null,
        },
      }),

      this.prisma.category.count({
        where: {
          deletedAt: null,
          createdAt: {
            gte: quarterStart,
            lte: now,
          },
        },
      }),

      this.prisma.category.count({
        where: {
          deletedAt: null,
          status: CategoryStatus.ACTIVE,
        },
      }),

      this.prisma.product.count({
        where: {
          deletedAt: null,
          status: ProductStatus.PUBLISHED,
          category: {
            deletedAt: null,
          },
        },
      }),
      this.prisma.category.count({
        where: {
          isFeatured: true,
          deletedAt: null,
        },
      }),
    ]);

    return {
      totalCategories,
      newThisQuarter,
      activeDisplay,
      publishedProducts,
      featuredCategoriesCount,
    };
  }

  findAllCategories() {
    return this.prisma.category.findMany({
      where: {
        deletedAt: null,
      },

      select: {
        id: true,
        name: true,
        slug: true,
        description: true,

        parentId: true,
        parent: {
          select: {
            id: true,
            name: true,
          },
        },

        imageUrl: true,
        imageFileName: true,
        imageWidth: true,
        imageHeight: true,
        imageSizeBytes: true,

        status: true,
        isFeatured: true,
        displayOrder: true,

        _count: {
          select: {
            products: {
              where: {
                deletedAt: null,
                status: 'PUBLISHED',
              },
            },

            children: {
              where: {
                deletedAt: null,
              },
            },
          },
        },
      },

      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  findCategoryById(id: string) {
    return this.prisma.category.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        parentId: true,
        parent: {
          select: {
            name: true,
          },
        },
        imageUrl: true,
        imageFileName: true,
        imageWidth: true,
        imageHeight: true,
        imageSizeBytes: true,
        status: true,
      },
    });
  }

  findCategoriesHierarchy() {
    return this.prisma.category.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        slug: true,
        parentId: true,
      },
    });
  }

  createCategory(data: Prisma.CategoryCreateInput) {
    return this.prisma.category.create({
      data,
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
        createdAt: true,
      },
    });
  }

  updateCategory(id: string, data: Prisma.CategoryUpdateInput) {
    return this.prisma.category.update({
      where: { id },
      data,
      select: {
        id: true,
        updatedAt: true,
        imageUrl: true,
      },
    });
  }

  findCategoryBySlug(slug: string) {
    return this.prisma.category.findUnique({
      where: { slug },
      select: { id: true },
    });
  }

  findCategoryDeleteInfo(id: string) {
    return this.prisma.category.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
        _count: {
          select: {
            products: true,
            children: {
              where: { deletedAt: null },
            },
          },
        },
      },
    });
  }

  async softDeleteCategory(id: string, reassignToId?: string) {
    return this.transaction.run(async (tx) => {
      let reassignedProducts = 0;

      if (reassignToId) {
        const result = await tx.product.updateMany({
          where: {
            categoryId: id,
          },
          data: {
            categoryId: reassignToId,
          },
        });

        reassignedProducts = result.count;
      }

      const category = await tx.category.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
        select: {
          id: true,
        },
      });

      return {
        deletedId: category.id,
        reassignedProducts,
      };
    });
  }
}
