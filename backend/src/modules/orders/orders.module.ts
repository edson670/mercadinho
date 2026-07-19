import { Module } from '@nestjs/common';
import { StockModule } from '@modules/stock/stock.module';
import { ORDER_NOTIFIER, NoopOrderNotifier } from './application/order-notifier';
import { CriarPedidoUseCase } from './application/criar-pedido.use-case';
import { AtualizarStatusPedidoUseCase } from './application/atualizar-status-pedido.use-case';
import { CancelarPedidoUseCase } from './application/cancelar-pedido.use-case';
import { OrdersQueryService } from './application/orders-query.service';
import { OrdersController } from './presentation/orders.controller';
import { PublicOrdersController } from './presentation/public-orders.controller';

@Module({
  imports: [StockModule],
  controllers: [OrdersController, PublicOrdersController],
  providers: [
    // W2 substitui por EvolutionWhatsAppNotifier (mensagens automáticas).
    { provide: ORDER_NOTIFIER, useClass: NoopOrderNotifier },
    CriarPedidoUseCase,
    AtualizarStatusPedidoUseCase,
    CancelarPedidoUseCase,
    OrdersQueryService,
  ],
})
export class OrdersModule {}
