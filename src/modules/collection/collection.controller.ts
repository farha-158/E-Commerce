// collections.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { UserRole } from '../../../generated/prisma/browser';
import { Roles } from '../../shared/decorators/user-role.decorator';
import { RolesGuard } from '../../shared/guards/role.guard';
import { JwtAccessGuard } from '../../shared/guards/jwt.guard';
import { multerOptions } from '../../shared/config/multer.config';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { CollectionsService } from './collection.service';
import { GetCollectionsQueryDto } from './dto/get-collections-query.dto';
import { CheckCollectionSlugQueryDto } from './dto/check-collection-slug-query.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { BulkCollectionStatusDto } from './dto/bulk-collection-status.dto';
import { BulkCollectionDeleteDto } from './dto/bulk-collection-delete.dto';
import { ManageCollectionProductsDto } from './dto/manage-collection-products.dto';

@ApiTags('Admin - Collections')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
@ApiForbiddenResponse({ description: 'Admin role required.' })
@Controller('admin/collections')
@Roles(UserRole.ADMIN)
@UseGuards(JwtAccessGuard, RolesGuard)
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create collection',
    description:
      'Creates a new curated collection with an optional cover image and initial products.',
  })
  @ApiBody({ type: CreateCollectionDto })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Collection information and images',
    schema: {
      allOf: [
        { $ref: getSchemaPath(CreateCollectionDto) },
        {
          type: 'object',
          properties: {
            image: {
              type: 'array',
              items: {
                type: 'string',
                format: 'binary',
              },
              maxItems: 1,
            },
          },
        },
      ],
    },
  })
  @ApiCreatedResponse({ description: 'Collection created successfully.' })
  @ApiBadRequestResponse({
    description:
      'Validation failed, invalid image MIME type, or some productIds do not exist.',
  })
  @ApiConflictResponse({ description: 'Collection slug already exists.' })
  @UseInterceptors(FileInterceptor('image', multerOptions('collections')))
  async create(
    @Body() dto: CreateCollectionDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    const data = await this.collectionsService.create(dto, image);
    return {
      message: 'Collection created successfully.',
      data,
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all collections',
    description:
      'Paginated list of collections with search, status/location filters and sorting.',
  })
  @ApiOkResponse({ description: 'Paginated list of collections.' })
  async findAll(@Query() query: GetCollectionsQueryDto) {
    const { data, meta } = await this.collectionsService.findAll(query);
    return { data, meta };
  }

  @Get('metrics')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Collection KPIs',
    description:
      'Returns totalCollections, activeCollections, featuredCount and curatedProductsCount.',
  })
  @ApiOkResponse({
    description: 'Collection metrics.',
    schema: {
      example: {
        data: {
          totalCollections: 6,
          activeCollections: 4,
          featuredCount: 2,
          curatedProductsCount: 51,
        },
      },
    },
  })
  async getMetrics() {
    const data = await this.collectionsService.getMetrics();
    return { data };
  }

  @Get('check-slug')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check slug availability',
    description:
      'Checks whether a collection slug is available or already taken.',
  })
  @ApiOkResponse({
    description: 'Slug availability result.',
    schema: {
      example: { data: { available: true, slug: 'best-sellers-2025' } },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid slug format.' })
  async checkSlug(@Query() query: CheckCollectionSlugQueryDto) {
    const data = await this.collectionsService.checkSlug(query.slug);
    return { data };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get collection by id',
    description:
      'Retrieves a single collection including its attached products.',
  })
  @ApiParam({ name: 'id', example: 'col-home-grid-01' })
  @ApiOkResponse({
    description: 'Collection details with products.',
    schema: {
      example: {
        data: {
          id: 'col-home-grid-01',
          title: 'Featured Highlights (Home Grid)',
          slug: 'featured-highlights-home-grid',
          imageUrl: 'http://localhost:3000/uploads/collections/home-grid.webp',
          description: 'Hero tier flagship hardware.',
          displayLocation: 'HOME_GRID',
          status: 'ACTIVE',
          isFeatured: true,
          badgeText: 'FEATURED 2026',
          productCount: 8,
          products: [
            {
              id: 'prod-1',
              title: 'AeroSound ANC Pro',
              sku: 'AERO-HEADPHONE-001',
              basePrice: 199.99,
              imageUrl: 'http://localhost:3000/uploads/products/aero.webp',
            },
          ],
          createdAt: '2025-01-01T08:00:00.000Z',
          updatedAt: '2026-04-12T10:00:00.000Z',
        },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Collection not found.' })
  async findOne(@Param('id') id: string) {
    const data = await this.collectionsService.findOne(id);
    return { data };
  }

  @Put(':id')
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update collection',
    description:
      'Updates collection metadata. If an image file is sent it replaces the old one. If productIds is sent, it replaces the whole product list; if omitted, products are left unchanged.',
  })
  @ApiParam({ name: 'id', example: 'col-home-grid-01' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Collection information and images',
    schema: {
      allOf: [
        { $ref: getSchemaPath(CreateCollectionDto) },
        {
          type: 'object',
          properties: {
            image: {
              type: 'array',
              items: {
                type: 'string',
                format: 'binary',
              },
              maxItems: 1,
            },
          },
        },
      ],
    },
  })
  @ApiOkResponse({ description: 'Collection updated successfully.' })
  @ApiBadRequestResponse({
    description:
      'Validation failed, invalid image MIME type, or some productIds do not exist.',
  })
  @ApiNotFoundResponse({ description: 'Collection not found.' })
  @ApiConflictResponse({ description: 'Collection slug already exists.' })
  @UseInterceptors(FileInterceptor('image', multerOptions('collections')))
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCollectionDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    const data = await this.collectionsService.update(id, dto, image);
    return {
      message: 'Collection updated successfully.',
      data,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete collection',
    description:
      'Deletes a collection. Associated products are NOT deleted; only their association with the collection is removed.',
  })
  @ApiParam({ name: 'id', example: 'col-home-grid-01' })
  @ApiOkResponse({
    description: 'Collection deleted successfully.',
    schema: { example: { message: 'Collection deleted successfully.' } },
  })
  @ApiNotFoundResponse({ description: 'Collection not found.' })
  async remove(@Param('id') id: string) {
    const { message } = await this.collectionsService.remove(id);
    return { message };
  }

  @Post('bulk-status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bulk update collection status',
    description: 'Updates the status of multiple collections at once.',
  })
  @ApiBody({ type: BulkCollectionStatusDto })
  @ApiOkResponse({
    description: 'Status updated.',
    schema: {
      example: {
        message: 'Updated status for 2 collections.',
        data: { affectedCount: 2 },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Validation failed.' })
  async bulkStatus(@Body() dto: BulkCollectionStatusDto) {
    const { message, data } =
      await this.collectionsService.bulkUpdateStatus(dto);
    return { message, data };
  }

  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bulk delete collections',
    description:
      'Deletes multiple collections. Associated products are NOT deleted.',
  })
  @ApiBody({ type: BulkCollectionDeleteDto })
  @ApiOkResponse({
    description: 'Collections deleted.',
    schema: {
      example: {
        message: 'Successfully deleted 2 collections.',
        data: { affectedCount: 2 },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Validation failed.' })
  @ApiNotFoundResponse({
    description: 'No collections found for the provided ids.',
  })
  async bulkDelete(@Body() dto: BulkCollectionDeleteDto) {
    const { message, data } = await this.collectionsService.bulkRemove(dto);
    return { message, data };
  }

  @Post(':id/products')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Add, remove or set collection products',
    description:
      "action 'add' appends products, 'remove' detaches them, 'set' replaces the entire collection items with the provided IDs.",
  })
  @ApiParam({ name: 'id', example: 'col-bestsellers-02' })
  @ApiBody({ type: ManageCollectionProductsDto })
  @ApiOkResponse({
    description: 'Collection products updated successfully.',
    schema: {
      example: {
        message: 'Collection products updated successfully.',
        data: { collectionId: 'col-bestsellers-02', productCount: 16 },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Validation failed or some productIds do not exist.',
  })
  @ApiNotFoundResponse({ description: 'Collection not found.' })
  async manageProducts(
    @Param('id') id: string,
    @Body() dto: ManageCollectionProductsDto,
  ) {
    const { message, data } = await this.collectionsService.manageProducts(
      id,
      dto,
    );
    return { message, data };
  }
}
