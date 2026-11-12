import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CategoriesRepository } from './category.repository';
import { GetCategoriesQueryDto } from './dto/get-categories-query.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { DeleteFile } from '../../shared/utils/delete-file.util';

@Injectable()
export class CategoryService {
  constructor(private readonly categoriesRepo: CategoriesRepository) {}

  async getCategoriesKpis() {
    const stats = await this.categoriesRepo.getCategoriesKpis();

    const activePercentage =
      stats.totalCategories > 0
        ? (stats.activeDisplay / stats.totalCategories) * 100
        : 0;

    const avgProductsPerCategory =
      stats.totalCategories > 0
        ? Math.round(stats.publishedProducts / stats.totalCategories)
        : 0;

    return {
      data: {
        totalCategories: stats.totalCategories,
        newThisQuarter: stats.newThisQuarter,
        activeDisplay: stats.activeDisplay,
        activePercentText: `${activePercentage.toFixed(1)}% Live`,
        avgProductsPerCategory,
        featuredCollectionsCount: stats.featuredCategoriesCount,
      },
    };
  }

  async getCategories(query: GetCategoriesQueryDto) {
    const categories = await this.categoriesRepo.findAllCategories();

    const baseUrl = process.env.APP_URL;

    const categoryMap = new Map(
      categories.map((category) => [category.id, category]),
    );

    const filteredCategories = categories.filter((category) => {
      const matchesStatus =
        query.status === 'all' ||
        category.status.toLowerCase() === query.status;

      const matchesLevel =
        query.level === 'all' ||
        (query.level === 'root' && category.parentId === null) ||
        (query.level === 'subcategory' && category.parentId !== null);

      const search = query.search?.toLowerCase();

      const matchesSearch =
        !search ||
        category.name.toLowerCase().includes(search) ||
        category.slug.toLowerCase().includes(search);

      return matchesStatus && matchesLevel && matchesSearch;
    });

    const siblingsMap = new Map<string | null, typeof categories>();

    for (const category of categories) {
      const siblings = siblingsMap.get(category.parentId) ?? [];
      siblings.push(category);
      siblingsMap.set(category.parentId, siblings);
    }

    const getDisplayOrder = (
      category: (typeof categories)[number],
      visited = new Set<string>(),
    ): string => {
      if (visited.has(category.id)) return '0';

      visited.add(category.id);

      const siblings = siblingsMap.get(category.parentId) ?? [];

      const index = siblings.findIndex((item) => item.id === category.id);

      const position =
        category.displayOrder > 0 ? category.displayOrder : index + 1;

      const parent = category.parentId
        ? categoryMap.get(category.parentId)
        : undefined;

      return parent
        ? `${getDisplayOrder(parent, visited)}.${position}`
        : `${position}`;
    };

    const formattedCategories = filteredCategories.map((category) => {
      const imageSizeText =
        category.imageWidth !== null &&
        category.imageHeight !== null &&
        category.imageSizeBytes !== null
          ? `${category.imageSizeBytes} px (${Math.round(category.imageSizeBytes / 1024)} KB)`
          : null;

      return {
        id: category.id,
        name: category.name,
        slug: category.slug,
        fullPath: `${baseUrl}/${category.imageUrl?.replace(/\\/g, '/')}`,
        description: category.description,

        level: category.parentId ? 'subcategory' : 'root',

        parentId: category.parentId,
        parentName: category.parent?.name ?? null,

        imageUrl: category.imageUrl,
        imageFileName: category.imageFileName,
        imageSizeText,

        totalProductsCount: category._count.products,
        subcategoriesCount: category._count.children,

        status: category.status.toLowerCase(),
        isFeatured: category.isFeatured,
        displayOrder: `#${getDisplayOrder(category)}`,
      };
    });

    if (query.view === 'tree') {
      const treeNodes = new Map<string, any>();

      for (const category of formattedCategories) {
        treeNodes.set(category.id, {
          ...category,
          children: [],
        });
      }

      const tree: any[] = [];

      for (const node of treeNodes.values()) {
        const parent = node.parentId ? treeNodes.get(node.parentId) : undefined;

        if (parent) {
          parent.children.push(node);
        } else {
          tree.push(node);
        }
      }

      return {
        data: tree,
        meta: {
          page: 1,
          limit: filteredCategories.length,
          totalItems: filteredCategories.length,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    }

    const totalItems = formattedCategories.length;
    const page = query.page;
    const limit = query.limit;

    const totalPages = Math.ceil(totalItems / limit);
    const skip = (page - 1) * limit;

    const data = formattedCategories.slice(skip, skip + limit);

    return {
      data,
      meta: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1 && page <= totalPages,
      },
    };
  }

  async getCategoryDetails(id: string) {
    const category = await this.categoriesRepo.findCategoryById(id);

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const baseUrl = process.env.APP_URL;

    const imageSizeText = category.imageSizeBytes
      ? `${category.imageSizeBytes}px (${Math.round(
          category.imageSizeBytes / 1024,
        )} KB)`
      : null;

    return {
      data: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        fullPath: `${baseUrl}/${category.imageUrl?.replace(/\\/g, '/')}`,
        description: category.description,
        level: category.parentId ? 'subcategory' : 'root',
        parentId: category.parentId,
        imageUrl: category.imageUrl,
        imageFileName: category.imageFileName,
        imageSizeText,
        status: category.status.toLowerCase(),
      },
    };
  }

  async createCategory(dto: CreateCategoryDto, image: Express.Multer.File) {
    if (dto.parentId) {
      const parent = await this.categoriesRepo.findCategoryById(dto.parentId);

      if (!parent) {
        throw new NotFoundException('Parent category not found');
      }
    }

    const status = (dto.status ?? 'draft').toUpperCase() as
      'ACTIVE' | 'DRAFT' | 'SCHEDULED';

    let category;

    try {
      category = await this.categoriesRepo.createCategory({
        name: dto.name,
        slug: dto.slug,
        parent: dto.parentId ? { connect: { id: dto.parentId } } : undefined,
        description: dto.description,
        imageUrl: image ? image.path : null,
        imageFileName: image ? image.filename : null,
        imageSizeBytes: image ? image.size : null,
        status,
      });
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('A category with this slug already exists');
      }

      throw error;
    }

    return {
      message: `Category '${category.name}' created successfully.`,
      data: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        level: category.parentId ? 'subcategory' : 'root',
        createdAt: category.createdAt,
      },
    };
  }

  async updateCategory(
    id: string,
    dto: UpdateCategoryDto,
    image?: Express.Multer.File,
  ) {
    const existingCategory = await this.categoriesRepo.findCategoryById(id);

    if (!existingCategory) {
      throw new NotFoundException('Category not found');
    }
    const baseUrl = process.env.APP_URL;

    if (dto.slug && dto.slug !== existingCategory.slug) {
      const slugCategory = await this.categoriesRepo.findCategoryBySlug(
        dto.slug,
      );

      if (slugCategory && slugCategory.id !== id) {
        throw new ConflictException('A category with this slug already exists');
      }
    }

    if (dto.parentId !== undefined && dto.parentId !== null) {
      if (dto.parentId === id) {
        throw new BadRequestException('A category cannot be its own parent');
      }

      const parent = await this.categoriesRepo.findCategoryById(dto.parentId);

      if (!parent) {
        throw new NotFoundException('Parent category not found');
      }

      const hierarchy = await this.categoriesRepo.findCategoriesHierarchy();

      const descendants = new Set<string>();
      const queue = [id];

      while (queue.length > 0) {
        const currentId = queue.shift()!;

        if (descendants.has(currentId)) continue;

        descendants.add(currentId);

        for (const item of hierarchy) {
          if (item.parentId === currentId) {
            queue.push(item.id);
          }
        }
      }

      if (descendants.has(dto.parentId)) {
        throw new BadRequestException(
          'Cannot move a category under one of its descendants',
        );
      }
    }

    const updateData = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.slug !== undefined && { slug: dto.slug }),
      ...(dto.description !== undefined && {
        description: dto.description,
      }),

      ...(dto.parentId !== undefined && {
        parent:
          dto.parentId === null
            ? { disconnect: true }
            : { connect: { id: dto.parentId } },
      }),

      ...(dto.status !== undefined && {
        status: dto.status.toUpperCase() as 'ACTIVE' | 'DRAFT' | 'SCHEDULED',
      }),

      ...(image && {
        imageUrl: image.path,
        imageFileName: image.filename,
        imageSizeBytes: image.size,
      }),
    };

    const category = await this.categoriesRepo.updateCategory(id, updateData);

    if (image && existingCategory.imageFileName) {
      await DeleteFile(existingCategory.imageFileName, 'categories');
    }

    return {
      message: 'Category updated successfully.',
      data: {
        category: {
          ...category,
          fullPath: `${baseUrl}/${category.imageUrl?.replace(/\\/g, '/')}`,
        },
      },
    };
  }

  async deleteCategory(id: string, reassignToId?: string) {
    const category = await this.categoriesRepo.findCategoryDeleteInfo(id);

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (category._count.children > 0) {
      throw new ConflictException(
        'Cannot delete a category that has active subcategories',
      );
    }

    if (category._count.products > 0 && !reassignToId) {
      throw new BadRequestException(
        'reassignToId is required because this category has products',
      );
    }

    if (reassignToId) {
      if (reassignToId === id) {
        throw new BadRequestException(
          'Cannot reassign products to the same category',
        );
      }

      const fallbackCategory =
        await this.categoriesRepo.findCategoryById(reassignToId);

      if (!fallbackCategory) {
        throw new NotFoundException('Fallback category not found');
      }
    }

    const result = await this.categoriesRepo.softDeleteCategory(
      id,
      reassignToId,
    );

    return {
      message: reassignToId
        ? 'Category deleted. Products reassigned.'
        : 'Category deleted successfully.',
      data: {
        deletedId: result.deletedId,
      },
    };
  }

  async checkCategorySlug(slug: string) {
    const existingCategory = await this.categoriesRepo.findCategoryBySlug(slug);

    return {
      data: {
        available: !existingCategory,
        slug,
      },
    };
  }
}
