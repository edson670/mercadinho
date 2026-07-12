import { Module } from '@nestjs/common';
import { CATEGORY_REPOSITORY } from './domain/category.repository';
import { PrismaCategoryRepository } from './infra/prisma-category.repository';
import { CategoriesService } from './application/categories.service';
import { CategoriesController } from './presentation/categories.controller';

@Module({
  controllers: [CategoriesController],
  providers: [
    { provide: CATEGORY_REPOSITORY, useClass: PrismaCategoryRepository },
    CategoriesService,
  ],
  exports: [CATEGORY_REPOSITORY],
})
export class CategoriesModule {}
