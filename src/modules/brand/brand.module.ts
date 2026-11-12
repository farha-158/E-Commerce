import { Module } from '@nestjs/common';
import { BrandsService } from './brand.service';
import { BrandsRepository } from './brand.repository';
import { BrandsController } from './brand.controller';
import { DatabaseModule } from '../../shared/db/database.module';

@Module({
  providers: [BrandsRepository, BrandsService],
  controllers:[BrandsController],
  imports:[DatabaseModule]
})
export class BrandsModule {}
