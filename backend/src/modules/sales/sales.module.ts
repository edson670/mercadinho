import { Module } from '@nestjs/common';
import { StockModule } from '@modules/stock/stock.module';
import { CustomersModule } from '@modules/customers/customers.module';
import { FinalizarVendaUseCase } from './application/finalizar-venda.use-case';
import { CancelarVendaUseCase } from './application/cancelar-venda.use-case';
import { SalesQueryService } from './application/sales-query.service';
import { SalesController } from './presentation/sales.controller';

@Module({
  imports: [StockModule, CustomersModule],
  controllers: [SalesController],
  providers: [FinalizarVendaUseCase, CancelarVendaUseCase, SalesQueryService],
})
export class SalesModule {}
