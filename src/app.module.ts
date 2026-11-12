import { Module } from '@nestjs/common';
import { DatabaseModule } from './shared/db/database.module';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { OutboxModule } from './modules/outbox/outbox.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ProductModule } from './modules/product/product.module';
import { CategoryModule } from './modules/category/category.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { BrandsModule } from './modules/brand/brand.module';
import { CollectionModule } from './modules/collection/collection.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 10,
      },
    ]),
    DatabaseModule,
    AuthModule,
    UserModule,
    OutboxModule,
    ProductModule,
    CategoryModule,
    BrandsModule,
    CollectionModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
