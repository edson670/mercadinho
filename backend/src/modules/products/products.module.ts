import { Module } from '@nestjs/common';
import { CategoriesModule } from '@modules/categories/categories.module';
import { PRODUCT_REPOSITORY } from './domain/product.repository';
import { PrismaProductRepository } from './infra/prisma-product.repository';
import { ProductsService } from './application/products.service';
import { ProductsController } from './presentation/products.controller';

@Module({
  imports: [CategoriesModule],
  controllers: [ProductsController],
  providers: [
    { provide: PRODUCT_REPOSITORY, useClass: PrismaProductRepository },
    ProductsService,
  ],
  exports: [PRODUCT_REPOSITORY],
})
export class ProductsModule {}
