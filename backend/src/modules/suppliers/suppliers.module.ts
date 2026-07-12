import { Module } from '@nestjs/common';
import { SUPPLIER_REPOSITORY } from './domain/supplier.repository';
import { PrismaSupplierRepository } from './infra/prisma-supplier.repository';
import { SuppliersService } from './application/suppliers.service';
import { SuppliersController } from './presentation/suppliers.controller';

@Module({
  controllers: [SuppliersController],
  providers: [
    { provide: SUPPLIER_REPOSITORY, useClass: PrismaSupplierRepository },
    SuppliersService,
  ],
  exports: [SUPPLIER_REPOSITORY],
})
export class SuppliersModule {}
