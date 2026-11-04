import { Module } from '@nestjs/common';
import { CategoriesRepository } from './category.repository';
import { DatabaseModule } from '../../shared/db/database.module';
import { CategoryService } from './category.service';
import { CategoryController } from './category-admin.controller';

@Module({
  providers: [CategoriesRepository, CategoryService],
  imports: [DatabaseModule],
  controllers: [CategoryController],
})
export class CategoryModule {}
