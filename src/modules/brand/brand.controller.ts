// brands.controller.ts
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Get,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Param,
  Put,
  Patch,
  Delete,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
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
  ApiBadRequestResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { BrandsService } from './brand.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { Roles } from '../../shared/decorators/user-role.decorator';
import { UserRole } from '../../../generated/prisma/browser';
import { RolesGuard } from '../../shared/guards/role.guard';
import { JwtAccessGuard } from '../../shared/guards/jwt.guard';
import { multerOptions } from '../../shared/config/multer.config';
import { GetBrandsQueryDto } from './dto/get-brands-query.dto';
import { CheckSlugQueryDto } from './dto/check-slug-query.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { BulkStatusDto } from './dto/bulk-status.dto';
import { BulkDeleteDto } from './dto/bulk-delete.dto';

@ApiTags('Admin - Brands')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
@ApiForbiddenResponse({ description: 'Admin role required.' })
@Controller('admin/brands')
@Roles(UserRole.ADMIN)
@UseGuards(JwtAccessGuard, RolesGuard)
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create brand',
    description: 'Creates a new brand with an optional logo upload.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Brand information and images',
    schema: {
      allOf: [
        { $ref: getSchemaPath(CreateBrandDto) },
        {
          type: 'object',
          properties: {
            logo: {
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
  @ApiCreatedResponse({ description: 'Brand created successfully.' })
  @ApiBadRequestResponse({
    description: 'Validation failed or invalid image MIME type.',
  })
  @ApiConflictResponse({ description: 'Brand slug already exists.' })
  @UseInterceptors(FileInterceptor('logo', multerOptions('brands')))
  async create(
    @Body() dto: CreateBrandDto,
    @UploadedFile() logo?: Express.Multer.File,
  ) {
    const data = await this.brandsService.create(dto, logo);
    return {
      message: 'Brand created successfully.',
      data,
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all brands',
    description:
      'Paginated list of brands with search, status/type filters and sorting.',
  })
  @ApiOkResponse({ description: 'Paginated list of brands.' })
  async findAll(@Query() query: GetBrandsQueryDto) {
    const { data, meta } = await this.brandsService.findAll(query);
    return {
      data,
      meta,
    };
  }

  @Get('metrics')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Brand KPIs',
    description:
      'Returns totalBrands, activeBrands, internalBrands and totalProductsAssigned.',
  })
  @ApiOkResponse({ description: 'Brand metrics.' })
  async getMetrics() {
    const data = await this.brandsService.getMetrics();
    return {
      data,
    };
  }

  @Get('check-slug')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check slug availability',
    description: 'Checks whether a brand slug is available or already taken.',
  })
  @ApiOkResponse({
    description: 'Slug availability result.',
    schema: {
      example: { data: { available: true, slug: 'aerosound' } },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid slug format.' })
  async checkSlug(@Query() query: CheckSlugQueryDto) {
    const data = await this.brandsService.checkSlug(query.slug);
    return {
      data,
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get brand by id',
    description: 'Retrieves a single brand profile including product count.',
  })
  @ApiParam({ name: 'id', example: 'brand-aerosound-01' })
  @ApiOkResponse({ description: 'Brand details.' })
  @ApiNotFoundResponse({ description: 'Brand not found.' })
  async findOne(@Param('id') id: string) {
    const data = await this.brandsService.findOne(id);
    return {
      data,
    };
  }

  @Put(':id')
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update brand',
    description:
      'Updates brand details. If a logo file is sent it replaces the old one, otherwise the existing logo is kept.',
  })
  @ApiParam({ name: 'id', example: 'brand-aerosound-01' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Brand information and images',
    schema: {
      allOf: [
        { $ref: getSchemaPath(UpdateBrandDto) },
        {
          type: 'object',
          properties: {
            logo: {
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
  @ApiOkResponse({ description: 'Brand updated successfully.' })
  @ApiBadRequestResponse({
    description: 'Validation failed or invalid image MIME type.',
  })
  @ApiNotFoundResponse({ description: 'Brand not found.' })
  @ApiConflictResponse({ description: 'Brand slug already exists.' })
  @UseInterceptors(FileInterceptor('logo', multerOptions('brands')))
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBrandDto,
    @UploadedFile() logo?: Express.Multer.File,
  ) {
    const data = await this.brandsService.update(id, dto, logo);
    return {
      message: 'Brand updated successfully.',
      data,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete brand',
    description:
      'Deletes a brand and detaches its products (brandId set to null).',
  })
  @ApiParam({ name: 'id', example: 'brand-aerosound-01' })
  @ApiOkResponse({ description: 'Brand deleted successfully.' })
  @ApiNotFoundResponse({ description: 'Brand not found.' })
  async remove(@Param('id') id: string) {
    const { message } = await this.brandsService.remove(id);
    return {
      message,
    };
  }

  @Post('bulk-status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bulk update brand status',
    description: 'Updates the status of multiple brands at once.',
  })
  @ApiBody({ type: BulkStatusDto })
  @ApiOkResponse({
    description: 'Status updated.',
    schema: {
      example: {
        message: 'Updated status for 2 brands.',
        data: { affectedCount: 2 },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Validation failed.' })
  async bulkStatus(@Body() dto: BulkStatusDto) {
    const { message, data } = await this.brandsService.bulkUpdateStatus(dto);
    return { success: true, status: 200, message, data };
  }

  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bulk delete brands',
    description: 'Deletes multiple brands and detaches their products.',
  })
  @ApiBody({ type: BulkDeleteDto })
  @ApiOkResponse({
    description: 'Brands deleted.',
    schema: {
      example: {
        message: 'Successfully deleted 2 brands.',
        data: { affectedCount: 2 },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Validation failed.' })
  @ApiNotFoundResponse({ description: 'No brands found for the provided ids.' })
  async bulkDelete(@Body() dto: BulkDeleteDto) {
    const { message, data } = await this.brandsService.bulkRemove(dto);
    return { success: true, status: 200, message, data };
  }
}
