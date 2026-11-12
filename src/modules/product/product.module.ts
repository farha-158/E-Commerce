import { Module } from '@nestjs/common';
import { ProductsRepository } from './product.repository';
import { ProductsService } from './product.service';
import { ProductsAdminController } from './product-admin.controller';
import { DatabaseModule } from '../../shared/db/database.module';

@Module({
  providers: [ProductsService, ProductsRepository],
  controllers: [ProductsAdminController],
  imports: [DatabaseModule],
  exports: [ProductsRepository],
})
export class ProductModule {}
