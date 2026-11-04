import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CategoriesRepository } from './category.repository';
import { GetCategoriesQueryDto } from './dto/get-categories-query.dto';
import { CreateCategoryDto } from './dto/create-category.dto';

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

    const getFullPath = (
      category: (typeof categories)[number],
      visited = new Set<string>(),
    ): string => {
      if (visited.has(category.id)) {
        return `/${category.slug}`;
      }

      visited.add(category.id);

      const parent = category.parentId
        ? categoryMap.get(category.parentId)
        : undefined;

      return parent
        ? `${getFullPath(parent, visited)}/${category.slug}`
        : `/${category.slug}`;
    };

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
          ? `${category.imageWidth} x ${category.imageHeight}px (${Math.round(category.imageSizeBytes / 1024)} KB)`
          : null;

      return {
        id: category.id,
        name: category.name,
        slug: category.slug,
        fullPath: getFullPath(category),
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

    const hierarchy = await this.categoriesRepo.findCategoriesHierarchy();

    const categoriesMap = new Map(hierarchy.map((item) => [item.id, item]));

    const path: string[] = [];
    let current = categoriesMap.get(category.id);

    const visited = new Set<string>();

    while (current) {
      if (visited.has(current.id)) {
        break;
      }

      visited.add(current.id);
      path.unshift(current.slug);

      current = current.parentId
        ? categoriesMap.get(current.parentId)
        : undefined;
    }

    const imageSizeText =
      category.imageWidth !== null &&
      category.imageHeight !== null &&
      category.imageSizeBytes !== null
        ? `${category.imageWidth} x ${category.imageHeight}px (${Math.round(
            category.imageSizeBytes / 1024,
          )} KB)`
        : null;

    return {
      data: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        fullPath: `/${path.join('/')}`,
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

  async createCategory(dto: CreateCategoryDto) {
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
        imageUrl: dto.imageUrl,
        imageFileName: dto.imageFileName,
        imageWidth: dto.imageWidth,
        imageHeight: dto.imageHeight,
        imageSizeBytes: dto.imageSizeBytes,
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

    const hierarchy = await this.categoriesRepo.findCategoriesHierarchy();

    const categoriesMap = new Map(hierarchy.map((item) => [item.id, item]));

    const path = [category.slug];
    let current = category.parentId
      ? categoriesMap.get(category.parentId)
      : undefined;

    const visited = new Set<string>();

    while (current) {
      if (visited.has(current.id)) break;

      visited.add(current.id);
      path.unshift(current.slug);

      current = current.parentId
        ? categoriesMap.get(current.parentId)
        : undefined;
    }

    return {
      message: `Category '${category.name}' created successfully.`,
      data: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        fullPath: `/${path.join('/')}`,
        level: category.parentId ? 'subcategory' : 'root',
        createdAt: category.createdAt,
      },
    };
  }

  async updateCategory(id: string, dto: CreateCategoryDto) {
    const existingCategory = await this.categoriesRepo.findCategoryById(id);

    if (!existingCategory) {
      throw new NotFoundException('Category not found');
    }

    const slugCategory = await this.categoriesRepo.findCategoryBySlug(dto.slug);

    if (slugCategory && slugCategory.id !== id) {
      throw new ConflictException('A category with this slug already exists');
    }

    if (dto.parentId) {
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

      while (queue.length) {
        const currentId = queue.shift()!;
        descendants.add(currentId);

        for (const item of hierarchy) {
          if (item.parentId === currentId && !descendants.has(item.id)) {
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

    const status = (dto.status ?? 'draft').toUpperCase() as
      'ACTIVE' | 'DRAFT' | 'SCHEDULED';

    const category = await this.categoriesRepo.updateCategory(id, {
      name: dto.name,
      slug: dto.slug,
      parent: dto.parentId ? { connect: { id: dto.parentId } } : undefined,
      description: dto.description,
      imageUrl: dto.imageUrl,
      imageFileName: dto.imageFileName,
      imageWidth: dto.imageWidth,
      imageHeight: dto.imageHeight,
      imageSizeBytes: dto.imageSizeBytes,
      status,
    });

    return {
      message: 'Category updated successfully.',
      data: category,
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
