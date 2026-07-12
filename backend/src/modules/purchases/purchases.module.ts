import { Module } from '@nestjs/common';
import { StockModule } from '@modules/stock/stock.module';
import { SuppliersModule } from '@modules/suppliers/suppliers.module';
import { RegisterPurchaseUseCase } from './application/register-purchase.use-case';
import { PurchasesQueryService } from './application/purchases-query.service';
import { PurchasesController } from './presentation/purchases.controller';

@Module({
  imports: [StockModule, SuppliersModule],
  controllers: [PurchasesController],
  providers: [RegisterPurchaseUseCase, PurchasesQueryService],
})
export class PurchasesModule {}
