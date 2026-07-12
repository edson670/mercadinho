import { Module } from '@nestjs/common';
import { StockService } from './application/stock.service';
import { StockQueryService } from './application/stock-query.service';
import { StockController } from './presentation/stock.controller';

@Module({
  controllers: [StockController],
  providers: [StockService, StockQueryService],
  exports: [StockService], // reutilizado por Compras e Vendas
})
export class StockModule {}
