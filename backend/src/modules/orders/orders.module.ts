import { Module } from '@nestjs/common';
import { StockModule } from '@modules/stock/stock.module';
import { WhatsAppModule } from '@modules/whatsapp/whatsapp.module';
import { WhatsAppOrderNotifier } from '@modules/whatsapp/application/whatsapp-order-notifier';
import { ORDER_NOTIFIER } from './application/order-notifier';
import { CompositeOrderNotifier } from './application/composite-order-notifier';
import { CriarPedidoUseCase } from './application/criar-pedido.use-case';
import { AtualizarStatusPedidoUseCase } from './application/atualizar-status-pedido.use-case';
import { CancelarPedidoUseCase } from './application/cancelar-pedido.use-case';
import { OrdersQueryService } from './application/orders-query.service';
import { OrdersController } from './presentation/orders.controller';
import { PublicOrdersController } from './presentation/public-orders.controller';

@Module({
  imports: [StockModule, WhatsAppModule],
  controllers: [OrdersController, PublicOrdersController],
  providers: [
    {
      // W4 adiciona o notificador Socket.IO a esta lista.
      provide: ORDER_NOTIFIER,
      useFactory: (whatsapp: WhatsAppOrderNotifier) =>
        new CompositeOrderNotifier([whatsapp]),
      inject: [WhatsAppOrderNotifier],
    },
    CriarPedidoUseCase,
    AtualizarStatusPedidoUseCase,
    CancelarPedidoUseCase,
    OrdersQueryService,
  ],
})
export class OrdersModule {}
