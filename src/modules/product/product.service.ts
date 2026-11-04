import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProductsRepository } from './product.repository';
import { CreateProductDto } from './dto/create.dto';
import { ConfigService } from '@nestjs/config';
import { ProductQueryDto } from './dto/product-query.dto';
import { DatabaseService } from '../../shared/db/database.service';
import { Prisma } from '../../../generated/prisma/browser';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productRepo: ProductsRepository,
    private readonly config: ConfigService,
    private readonly prisma: DatabaseService,
  ) {}

  // ───── Create ─────
  async create(dto: CreateProductDto, files: Express.Multer.File[]) {
    const imagesData = (files ?? []).map((file, index) => ({
      url: `/uploads/products/${file.filename}`,
      position: index,
      isPrimary: index === 0,
    }));

    const {
      categoryId,
      brandId,
      taxProfileId,
      shippingProfileId,
      collectionIds,
      colorOptions,
      careOptions,
      variants,
      productStatus,
      customerHighlights,
      ...productData
    } = dto;

    return this.productRepo.create({
      ...productData,

      status: productStatus ?? 'DRAFT',
      highlights: customerHighlights ?? [],

      category: {
        connect: { id: categoryId },
      },

      ...(brandId && {
        brand: { connect: { id: brandId } },
      }),

      ...(taxProfileId && {
        taxProfile: { connect: { id: taxProfileId } },
      }),

      ...(shippingProfileId && {
        shippingProfile: { connect: { id: shippingProfileId } },
      }),

      media: {
        create: imagesData,
      },
    });
  }

  // ───── Read ─────
  async findOne(id: string) {
    const product = await this.productRepo.findById(id);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return {
      data: {
        ...product,
        media: product.media.map((image) => ({
          ...image,
          url: `${this.config.get('APP_URL')}${image.url}`,
        })),
      },
    };
  }

  async findAll(query: ProductQueryDto) {
    const {
      page,
      limit,
      search,
      category,
      status,
      stock,
      brand,
      sortBy,
      sortOrder,
    } = query;

    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        {
          title: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          sku: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          barcode: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          brand: {
            is: {
              name: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        },
        {
          variants: {
            some: {
              sku: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        },
      ];
    }

    if (category && category !== 'all') {
      where.category = {
        is: {
          OR: [
            { id: category },
            {
              name: {
                equals: category,
                mode: 'insensitive',
              },
            },
          ],
        },
      };
    }

    if (brand && brand !== 'all') {
      where.brand = {
        is: {
          name: {
            equals: brand,
            mode: 'insensitive',
          },
        },
      };
    }

    if (status !== 'all') {
      if (status === 'published') {
        where.status = 'PUBLISHED';
      } else if (status === 'draft') {
        where.status = 'DRAFT';
      } else if (status === 'archived') {
        where.status = 'ARCHIVED';
      } else if (status === 'unpublished') {
        where.status = 'UNPUBLISHED';
      }
    }

    if (stock === 'in_stock') {
      where.stockCount = {
        gt: this.prisma.product.fields.lowStockThreshold,
      };
    } else if (stock === 'out_of_stock') {
      where.stockCount = {
        lte: 0,
      };
    } else if (stock === 'low_stock') {
      where.AND = [
        {
          stockCount: {
            gt: 0,
            lte: this.prisma.product.fields.lowStockThreshold,
          },
        },
      ];
    }

    const sortFields: Record<string, string> = {
      name: 'title',
      price: 'basePrice',
      stock: 'stockCount',
      updatedAt: 'updatedAt',
    };

    const orderBy = {
      [sortFields[sortBy] ?? 'updatedAt']: sortOrder,
    } as Prisma.ProductOrderByWithRelationInput;

    const skip = (page - 1) * limit;

    const { products, totalItems } = await this.productRepo.findAll(
      where,
      orderBy,
      skip,
      limit,
    );

    const data = products.map((product) => {
      const primaryImage =
        product.media.find((image) => image.isPrimary) ?? product.media[0];

      const stockCount = product.stockCount ?? 0;

      const stockState =
        stockCount <= 0
          ? 'out_of_stock'
          : stockCount <= product.lowStockThreshold
            ? 'low_stock'
            : 'in_stock';

      const price = Number(product.basePrice);
      const costPrice = Number(product.costPrice ?? 0);

      const marginPercent =
        price > 0
          ? Number((((price - costPrice) / price) * 100).toFixed(1))
          : 0;

      return {
        id: product.id,
        name: product.title,
        variantLabel: `${product.variants.length} variants`,
        sku: product.sku ?? product.variants[0]?.sku ?? null,
        upc: product.barcode,
        category: product.category.name,
        brand: product.brand?.name ?? null,
        stockCount,
        stockState,
        price,
        originalPrice: product.comparePrice
          ? Number(product.comparePrice)
          : null,
        costPrice,
        marginPercent,
        status: product.status.toLowerCase(),
        updatedAt: product.updatedAt,
        imageUrl: primaryImage?.url ?? null,
      };
    });

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data,
      meta: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async getCatalogMetrics() {
    return { data: await this.productRepo.getCatalogMetrics() };
  }

  async checkSkuAvailability(sku: string) {
    const product = await this.productRepo.checkSkuAvailability(sku);

    return { data: { available: !product, sku } };
  }

  async checkSlugAvailability(slug: string) {
    const product = await this.productRepo.checkSlugAvailability(slug);

    return {
      data: {
        available: !product,
        slug,
      },
    };
  }
}
