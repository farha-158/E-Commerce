import { Module } from '@nestjs/common';
import { CollectionsRepository } from './collection.repository';
import { CollectionsService } from './collection.service';
import { CollectionsController } from './collection.controller';
import { DatabaseModule } from '../../shared/db/database.module';
import { ProductModule } from '../product/product.module';

@Module({
  providers: [CollectionsRepository, CollectionsService],
  controllers: [CollectionsController],
  imports: [DatabaseModule, ProductModule],
})
export class CollectionModule {}
