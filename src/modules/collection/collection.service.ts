import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '../../../generated/prisma/client';
import { CollectionsRepository } from './collection.repository';
import { ProductsRepository } from '../product/product.repository';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { DeleteFile } from '../../shared/utils/delete-file.util';
import { GetCollectionsQueryDto } from './dto/get-collections-query.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { BulkCollectionStatusDto } from './dto/bulk-collection-status.dto';
import { BulkCollectionDeleteDto } from './dto/bulk-collection-delete.dto';
import { ManageCollectionProductsDto } from './dto/manage-collection-products.dto';

@Injectable()
export class CollectionsService {
  private readonly baseUrl: string;
  private readonly Folder: string;

  constructor(
    private readonly collectionRepo: CollectionsRepository,
    private readonly productRepo: ProductsRepository,
    config: ConfigService,
  ) {
    this.baseUrl = config.get<string>('APP_URL') ?? 'http://localhost:3000';
    this.Folder = 'collections';
  }

  async create(dto: CreateCollectionDto, file?: Express.Multer.File) {
    try {
      const existing = await this.collectionRepo.findBySlug(dto.slug);
      if (existing) {
        throw new ConflictException(
          `Collection with slug '${dto.slug}' already exists.`,
        );
      }

      const { productIds = [], ...fields } = dto;

      if (productIds.length > 0) {
        const found = await this.productRepo.findManyByIds(productIds);
        if (found.length !== productIds.length) {
          const foundIds = new Set(found.map((p) => p.id));
          const missing = productIds.filter((id) => !foundIds.has(id));
          throw new BadRequestException(
            `Products not found: ${missing.join(', ')}`,
          );
        }
      }

      const collection = await this.collectionRepo.create(
        { ...fields, imageUrl: file?.path },
        productIds,
      );

      return this.toResponse(collection);
    } catch (error) {
      if (file?.path)
        await DeleteFile(file.path, this.Folder).catch(() => null);

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `Collection with slug '${dto.slug}' already exists.`,
        );
      }
      throw error;
    }
  }

  async findAll(query: GetCollectionsQueryDto) {
    const { page, limit, search, status, location, sortBy, sortOrder } = query;

    const where: Prisma.CollectionWhereInput = {};

    const term = search?.trim();
    if (term) {
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { slug: { contains: term, mode: 'insensitive' } },
        { badgeText: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (status && status !== 'ALL') where.status = status;
    if (location && location !== 'ALL') where.displayLocation = location;

    const primaryOrder: Prisma.CollectionOrderByWithRelationInput =
      sortBy === 'productCount'
        ? { products: { _count: sortOrder } }
        : { [sortBy]: sortOrder };

    const [collections, totalItems] =
      await this.collectionRepo.findAllPaginated({
        where,
        orderBy: [primaryOrder, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      });

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: collections.map((c) => this.toResponse(c)),
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

  async getMetrics() {
    const [
      totalCollections,
      activeCollections,
      featuredCount,
      curatedProducts,
    ] = await this.collectionRepo.getMetrics();

    return {
      totalCollections,
      activeCollections,
      featuredCount,
      curatedProductsCount: curatedProducts.length,
    };
  }

  async checkSlug(slug: string) {
    const exists = await this.collectionRepo.slugExists(slug);
    return { available: !exists, slug };
  }

  async findOne(id: string) {
    const collection = await this.collectionRepo.findById(id);
    if (!collection) {
      throw new NotFoundException(`Collection with id '${id}' not found.`);
    }

    const { _count, products, ...rest } = this.toResponse(collection);

    return {
      ...rest,
      productCount: _count.products,
      products: products.map(({ product }) => ({
        ...product,
        media: product.media.map((image) => ({
          ...image,
          url: `${this.baseUrl}/${image.url}`,
        })),
        basePrice: product.basePrice != null ? Number(product.basePrice) : null,
      })),
    };
  }

  async update(
    id: string,
    dto: UpdateCollectionDto,
    file?: Express.Multer.File,
  ) {
    try {
      const collection = await this.collectionRepo.findById(id);
      if (!collection) {
        throw new NotFoundException(`Collection with id '${id}' not found.`);
      }

      if (dto.slug && dto.slug !== collection.slug) {
        const taken = await this.collectionRepo.findBySlugExcludingId(
          dto.slug,
          id,
        );
        if (taken) {
          throw new ConflictException(
            `Collection with slug '${dto.slug}' already exists.`,
          );
        }
      }

      const { productIds, ...fields } = dto;

      if (productIds && productIds.length > 0) {
        const found = await this.productRepo.findManyByIds(productIds);
        if (found.length !== productIds.length) {
          const foundIds = new Set(found.map((p) => p.id));
          const missing = productIds.filter((pid) => !foundIds.has(pid));
          throw new BadRequestException(
            `Products not found: ${missing.join(', ')}`,
          );
        }
      }

      const data: Omit<Prisma.CollectionUpdateInput, 'products'> = {
        ...fields,
      };

      if (file) {
        data.imageUrl = file.path;
      }

      const updated = await this.collectionRepo.update(id, data, productIds);

      if (file && collection.imageUrl) {
        await DeleteFile(collection.imageUrl, this.Folder);
      }

      return this.toResponse(updated);
    } catch (error) {
      if (file?.path)
        await DeleteFile(file.path, this.Folder).catch(() => null);

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `Collection with slug '${dto.slug}' already exists.`,
        );
      }
      throw error;
    }
  }

  async remove(id: string) {
    const collection = await this.collectionRepo.findById(id);
    if (!collection) {
      throw new NotFoundException(`Collection with id '${id}' not found.`);
    }

    await this.collectionRepo.delete(id);

    if (collection.imageUrl) {
      await DeleteFile(collection.imageUrl, this.Folder);
    }

    return { message: 'Collection deleted successfully.' };
  }

  async bulkUpdateStatus(dto: BulkCollectionStatusDto) {
    const { count } = await this.collectionRepo.updateManyStatus(
      dto.collectionIds,
      dto.status,
    );

    return {
      message: `Updated status for ${count} collections.`,
      data: { affectedCount: count },
    };
  }

  async bulkRemove(dto: BulkCollectionDeleteDto) {
    const collections = await this.collectionRepo.findManyByIds(
      dto.collectionIds,
    );

    if (collections.length === 0) {
      throw new NotFoundException('No collections found for the provided ids.');
    }

    const { count } = await this.collectionRepo.deleteMany(
      collections.map((c) => c.id),
    );

    await Promise.all(
      collections
        .filter((c) => c.imageUrl)
        .map((c) => DeleteFile(c.imageUrl!, this.Folder)),
    );

    return {
      message: `Successfully deleted ${count} collections.`,
      data: { affectedCount: count },
    };
  }

  async manageProducts(id: string, dto: ManageCollectionProductsDto) {
    const collection = await this.collectionRepo.findExistingId(id);
    if (!collection) {
      throw new NotFoundException(`Collection with id '${id}' not found.`);
    }

    const { action, productIds } = dto;

    if (action !== 'set' && productIds.length === 0) {
      throw new BadRequestException(
        `productIds must not be empty when action is '${action}'.`,
      );
    }

    if (action !== 'remove' && productIds.length > 0) {
      const found = await this.productRepo.findManyByIds(productIds);
      if (found.length !== productIds.length) {
        const foundIds = new Set(found.map((p) => p.id));
        const missing = productIds.filter((pid) => !foundIds.has(pid));
        throw new BadRequestException(
          `Products not found: ${missing.join(', ')}`,
        );
      }
    }

    switch (action) {
      case 'add': {
        const linked = await this.collectionRepo.findLinkedProductIds(id);
        const linkedSet = new Set(linked.map((l) => l.productId));
        const toAdd = productIds.filter((pid) => !linkedSet.has(pid));

        if (toAdd.length > 0) {
          const { _max } = await this.collectionRepo.getMaxPosition(id);
          const start = (_max.position ?? -1) + 1;
          await this.collectionRepo.addProducts(id, toAdd, start);
        }
        break;
      }
      case 'remove':
        await this.collectionRepo.removeProducts(id, productIds);
        break;
      case 'set':
        await this.collectionRepo.setProducts(id, productIds);
        break;
    }

    const productCount = await this.collectionRepo.countProducts(id);

    return {
      message: 'Collection products updated successfully.',
      data: { collectionId: id, productCount },
    };
  }

  private toResponse(collection: any) {
    const { _count, ...rest } = collection;
    return {
      ...rest,
      logoUrl: collection.imageUrl
        ? `${this.baseUrl}/${collection.imageUrl.replace(/\\/g, '/')}`
        : null,
      productCount: _count?.products ?? 0,
    };
  }
}
