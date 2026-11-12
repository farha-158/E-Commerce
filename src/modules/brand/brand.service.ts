// brands.service.ts
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BrandsRepository } from './brand.repository';
import { CreateBrandDto } from './dto/create-brand.dto';
import { DeleteFile } from '../../shared/utils/delete-file.util';
import { GetBrandsQueryDto } from './dto/get-brands-query.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { BulkStatusDto } from './dto/bulk-status.dto';
import { BulkDeleteDto } from './dto/bulk-delete.dto';
import { Prisma } from '../../../generated/prisma/client';

@Injectable()
export class BrandsService {
  constructor(
    private readonly brandsRepo: BrandsRepository,
  ) {}

  async create(dto: CreateBrandDto, file?: Express.Multer.File) {
    try {
      const existing = await this.brandsRepo.findBySlug(dto.slug);
      if (existing) {
        throw new ConflictException(
          `Brand with slug '${dto.slug}' already exists.`,
        );
      }

      const brand = await this.brandsRepo.create({
        ...dto,
        logoUrl: file?.path,
      });

      return this.toResponse(brand);
    } catch (error) {
      if (file?.path) await DeleteFile(file.path, 'brands').catch(() => null);

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `Brand with slug '${dto.slug}' already exists.`,
        );
      }
      throw error;
    }
  }

  async findAll(query: GetBrandsQueryDto) {
    const { page, limit, search, status, type, sortBy, sortOrder } = query;

    const where: Prisma.BrandWhereInput = {};

    if (search?.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { slug: { contains: search.trim(), mode: 'insensitive' } },
        { country: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (type === 'INTERNAL') where.isInternal = true;
    if (type === 'PARTNER') where.isInternal = false;

    const orderBy: Prisma.BrandOrderByWithRelationInput =
      sortBy === 'productCount'
        ? { products: { _count: sortOrder } }
        : { [sortBy]: sortOrder };

    const [brands, totalItems] = await this.brandsRepo.findAllPaginated({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: brands.map((b) => this.toResponse(b)),
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
    const [totalBrands, activeBrands, internalBrands, totalProductsAssigned] =
      await this.brandsRepo.getMetrics();

    return { totalBrands, activeBrands, internalBrands, totalProductsAssigned };
  }

  async checkSlug(slug: string) {
    const exists = await this.brandsRepo.slugExists(slug);
    return { available: !exists, slug };
  }

  async findOne(id: string) {
    const brand = await this.brandsRepo.findById(id);
    if (!brand) {
      throw new NotFoundException(`Brand with id '${id}' not found.`);
    }
    return this.toResponse(brand);
  }

  async update(id: string, dto: UpdateBrandDto, file?: Express.Multer.File) {
    try {
      const brand = await this.brandsRepo.findById(id);
      if (!brand) {
        throw new NotFoundException(`Brand with id '${id}' not found.`);
      }

      if (dto.slug && dto.slug !== brand.slug) {
        const taken = await this.brandsRepo.findBySlugExcludingId(dto.slug, id);
        if (taken) {
          throw new ConflictException(
            `Brand with slug '${dto.slug}' already exists.`,
          );
        }
      }

      const data: Prisma.BrandUpdateInput = { ...dto };

      if (file) {
        data.logoUrl = file.path;
      }

      const updated = await this.brandsRepo.update(id, data);

      if (file && brand.logoUrl) {
        await DeleteFile(brand.logoUrl, 'brands');
      }

      return this.toResponse(updated);
    } catch (error) {
      if (file?.path) await DeleteFile(file.path, 'brands').catch(() => null);

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `Brand with slug '${dto.slug}' already exists.`,
        );
      }
      throw error;
    }
  }

  async remove(id: string) {
    const brand = await this.brandsRepo.findById(id);
    if (!brand) {
      throw new NotFoundException(`Brand with id '${id}' not found.`);
    }

    await this.brandsRepo.deleteAndDetachProducts(id);

    if (brand.logoUrl) {
      await DeleteFile(brand.logoUrl, 'brands');
    }

    return { message: 'Brand deleted successfully.' };
  }

  async bulkUpdateStatus(dto: BulkStatusDto) {
    const { count } = await this.brandsRepo.updateManyStatus(
      dto.brandIds,
      dto.status,
    );

    return {
      message: `Updated status for ${count} brands.`,
      data: { affectedCount: count },
    };
  }

  async bulkRemove(dto: BulkDeleteDto) {
    const brands = await this.brandsRepo.findManyByIds(dto.brandIds);

    if (brands.length === 0) {
      throw new NotFoundException('No brands found for the provided ids.');
    }

    const ids = brands.map((b) => b.id);
    const [, { count }] =
      await this.brandsRepo.deleteManyAndDetachProducts(ids);

    await Promise.all(
      brands
        .filter((b) => b.logoUrl)
        .map((b) => DeleteFile(b.logoUrl!, 'brands')),
    );

    return {
      message: `Successfully deleted ${count} brands.`,
      data: { affectedCount: count },
    };
  }

  private toResponse(brand: any) {
    const baseUrl = process.env.APP_URL;

    const { _count, ...rest } = brand;
    return {
      ...rest,
      logoUrl: brand.logoUrl
        ? `${baseUrl}/${brand.logoUrl.replace(/\\/g, '/')}`
        : null,
      productCount: _count?.products ?? 0,
    };
  }
}
