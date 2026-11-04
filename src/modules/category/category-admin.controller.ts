import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { GetCategoriesQueryDto } from './dto/get-categories-query.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CheckCategorySlugDto } from './dto/check-category-slug.dto';
import { Roles } from '../../shared/decorators/user-role.decorator';
import { UserRole } from '../../../generated/prisma/enums';
import { JwtAccessGuard } from '../../shared/guards/jwt.guard';

@ApiTags('Admin - Categories')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@UseGuards(JwtAccessGuard)
@Controller('admin/categories')
export class CategoryController {
  constructor(private readonly categoriesService: CategoryService) {}

  @Get('kpis')
  @ApiOperation({
    summary: 'Get Categories KPIs',
    description: 'Retrieve category statistics for the admin dashboard.',
  })
  @ApiOkResponse({ description: 'Categories KPIs retrieved successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized.' })
  @ApiForbiddenResponse({ description: 'Admin access required.' })
  async getCategoriesKpis() {
    return this.categoriesService.getCategoriesKpis();
  }

  @Get('check-slug')
  @ApiQuery({ type: CheckCategorySlugDto })
  @ApiOperation({
    summary: 'Check Category Slug Availability',
    description: 'Check whether a category slug is available.',
  })
  @ApiQuery({
    name: 'slug',
    required: true,
    type: String,
    example: 'smart-wearables',
    description: 'Category slug to check.',
  })
  @ApiOkResponse({
    description: 'Slug availability checked successfully.',
    schema: {
      example: {
        success: true,
        status: 200,
        message: null,
        data: {
          available: true,
          slug: 'smart-wearables',
        },
        meta: null,
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid slug.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized.' })
  @ApiForbiddenResponse({ description: 'Admin access required.' })
  async checkCategorySlug(@Query() query: CheckCategorySlugDto) {
    return this.categoriesService.checkCategorySlug(query.slug);
  }

  @Get()
  @ApiQuery({ type: GetCategoriesQueryDto })
  @ApiOperation({
    summary: 'Get Categories',
    description:
      'Retrieve categories in flat or tree view with filters and pagination.',
  })
  @ApiOkResponse({ description: 'Categories retrieved successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid query parameters.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized.' })
  @ApiForbiddenResponse({ description: 'Admin access required.' })
  async getCategories(@Query() query: GetCategoriesQueryDto) {
    return this.categoriesService.getCategories(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get Single Category Details',
    description: 'Retrieve complete details of a specific category.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    example: 'cat-smart-wearables',
    description: 'Category ID.',
  })
  @ApiOkResponse({ description: 'Category details retrieved successfully.' })
  @ApiNotFoundResponse({ description: 'Category not found.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized.' })
  @ApiForbiddenResponse({ description: 'Admin access required.' })
  async getCategoryDetails(@Param('id') id: string) {
    return this.categoriesService.getCategoryDetails(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create Category',
    description: 'Create a new root category or child subcategory.',
  })
  @ApiBody({ type: CreateCategoryDto })
  @ApiCreatedResponse({
    description: 'Category created successfully.',
    schema: {
      example: {
        success: true,
        status: 201,
        message: "Category 'Smart Wearables' created successfully.",
        data: {
          id: 'cat-smart-wearables',
          name: 'Smart Wearables',
          slug: 'smart-wearables',
          fullPath: '/electronics-audio/smart-wearables',
          level: 'subcategory',
          createdAt: '2026-11-01T15:20:00.000Z',
        },
        meta: null,
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid category data.' })
  @ApiConflictResponse({ description: 'Category slug already exists.' })
  @ApiNotFoundResponse({ description: 'Parent category not found.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized.' })
  @ApiForbiddenResponse({ description: 'Admin access required.' })
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.createCategory(dto);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update Category',
    description: 'Update an existing category.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    example: 'cat-smart-wearables',
  })
  @ApiBody({ type: CreateCategoryDto })
  @ApiOkResponse({
    description: 'Category updated successfully.',
    schema: {
      example: {
        success: true,
        status: 200,
        message: 'Category updated successfully.',
        data: {
          id: 'cat-smart-wearables',
          updatedAt: '2026-11-01T15:25:00.000Z',
        },
        meta: null,
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid category data or circular hierarchy.',
  })
  @ApiConflictResponse({ description: 'Category slug already exists.' })
  @ApiNotFoundResponse({
    description: 'Category or parent category not found.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized.' })
  @ApiForbiddenResponse({ description: 'Admin access required.' })
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.categoriesService.updateCategory(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete Category',
    description:
      'Soft delete a category and optionally reassign its products to another category.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    example: 'cat-smart-wearables',
  })
  @ApiQuery({
    name: 'reassignToId',
    required: false,
    type: String,
    example: 'cat-electronics',
    description: 'Fallback category ID for reassignment of products.',
  })
  @ApiOkResponse({
    description: 'Category deleted successfully.',
    schema: {
      example: {
        success: true,
        status: 200,
        message: 'Category deleted. Products reassigned.',
        data: {
          deletedId: 'cat-smart-wearables',
        },
        meta: null,
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid reassignment request.' })
  @ApiConflictResponse({ description: 'Category has active subcategories.' })
  @ApiNotFoundResponse({
    description: 'Category or fallback category not found.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized.' })
  @ApiForbiddenResponse({ description: 'Admin access required.' })
  async deleteCategory(
    @Param('id') id: string,
    @Query('reassignToId') reassignToId?: string,
  ) {
    return this.categoriesService.deleteCategory(id, reassignToId);
  }
}
