import { Controller, UseGuards } from '@nestjs/common';
import { Roles } from '../../shared/decorators/user-role.decorator';
import { UserRole } from '../../../generated/prisma/enums';
import { JwtAccessGuard } from '../../shared/guards/jwt.guard';
import { ProductsService } from './product.service';
import {
  ApiExtraModels,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiOkResponse,
} from '@nestjs/swagger';
import { CreateProductDto } from './dto/create.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  UploadedFiles,
  Body,
  Post,
  Get,
  Query,
  Param,
  HttpCode,
  HttpStatus,
  UseInterceptors,
} from '@nestjs/common';
import { getSchemaPath } from '@nestjs/swagger';
import { multerOptions } from '../../shared/config/multer.config';
import { RolesGuard } from '../../shared/guards/role.guard';
import { BulkUpdateProductStatusDto } from './dto/update-status.dto';

@ApiTags('Admin - Products')
@ApiBearerAuth('access-token')
@Controller('admin/products')
@Roles(UserRole.ADMIN)
@UseGuards(JwtAccessGuard, RolesGuard)
export class ProductsAdminController {
  constructor(private readonly productService: ProductsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new product',
    description:
      'Create a product with its details, variants, and up to 12 images.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiExtraModels(CreateProductDto)
  @ApiBody({
    description: 'Product information and images',
    schema: {
      allOf: [
        { $ref: getSchemaPath(CreateProductDto) },
        {
          type: 'object',
          properties: {
            images: {
              type: 'array',
              items: {
                type: 'string',
                format: 'binary',
              },
              maxItems: 12,
            },
          },
        },
      ],
    },
  })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid product data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 409, description: 'SKU or slug already exists' })
  @UseInterceptors(FilesInterceptor('images', 12, multerOptions('products')))
  create(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: CreateProductDto,
  ) {
    return this.productService.create(dto, files);
  }

  @Get('metrics')
  @ApiOperation({
    summary: 'Get catalog KPI metrics',
    description: 'Retrieve product catalog statistics and KPIs.',
  })
  @ApiResponse({
    status: 200,
    description: 'Catalog metrics retrieved successfully',
  })
  getCatalogMetrics() {
    return this.productService.getCatalogMetrics();
  }

  @Get('check-sku')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check SKU availability',
    description: 'Check whether a product SKU is already used.',
  })
  @ApiQuery({
    name: 'sku',
    type: String,
    required: true,
    example: 'AERO-HEADPHONE-001',
    description: 'SKU to check',
  })
  @ApiResponse({ status: 200, description: 'SKU availability checked' })
  @ApiResponse({ status: 400, description: 'SKU is required or invalid' })
  checkSkuAvailability(@Query('sku') sku: string) {
    return this.productService.checkSkuAvailability(sku);
  }

  @Get('check-slug')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check slug availability',
    description: 'Check whether a product slug is already used.',
  })
  @ApiQuery({
    name: 'slug',
    type: String,
    required: true,
    example: 'aerosound-studio-headphones',
    description: 'Product slug to check',
  })
  @ApiResponse({ status: 200, description: 'Slug availability checked' })
  @ApiResponse({ status: 400, description: 'Slug is required or invalid' })
  checkSlugAvailability(@Query('slug') slug: string) {
    return this.productService.checkSlugAvailability(slug);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all products',
    description:
      'Retrieve products with pagination, search, filtering, and sorting.',
  })
  @ApiResponse({
    status: 200,
    description: 'Products retrieved successfully',
  })
  findAll(@Query() query: ProductQueryDto) {
    return this.productService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get product by ID',
    description: 'Retrieve complete details of a specific product.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    example: 'product-123',
    description: 'Product ID',
  })
  @ApiResponse({ status: 200, description: 'Product retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  @Post('bulk-status')
  @ApiOperation({
    summary: 'Bulk Update Products Status',
    description: 'Update status for multiple products in a single transaction.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        productIds: {
          type: 'array',
          items: { type: 'string' },
          example: ['prod-1', 'prod-2', 'prod-3'],
        },
        status: {
          type: 'string',
          enum: ['published', 'unpublished', 'archived'],
          example: 'published',
        },
      },
      required: ['productIds', 'status'],
    },
  })
  @ApiOkResponse({
    description: 'Products status updated successfully.',
  })
  async bulkUpdateStatus(@Body() dto: BulkUpdateProductStatusDto) {
    return this.productService.bulkUpdateStatus(dto.productIds, dto.status);
  }
}
