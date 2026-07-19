import { Logger } from '@nestjs/common';
import { Pedido, StatusPedido } from '@prisma/client';
import { IOrderNotifier, PedidoComItens } from './order-notifier';

/**
 * Fan-out para vários notificadores (WhatsApp agora, Socket.IO na W4).
 * Isola falhas: um canal quebrado não impede os demais nem o fluxo do pedido.
 */
export class CompositeOrderNotifier implements IOrderNotifier {
  private readonly logger = new Logger(CompositeOrderNotifier.name);

  constructor(private readonly notifiers: IOrderNotifier[]) {}

  async orderCreated(pedido: PedidoComItens): Promise<void> {
    await this.fanOut((n) => n.orderCreated(pedido), 'orderCreated');
  }

  async orderStatusChanged(pedido: Pedido, novoStatus: StatusPedido): Promise<void> {
    await this.fanOut((n) => n.orderStatusChanged(pedido, novoStatus), 'orderStatusChanged');
  }

  private async fanOut(fn: (n: IOrderNotifier) => Promise<void>, evento: string) {
    const resultados = await Promise.allSettled(this.notifiers.map(fn));
    resultados.forEach((r) => {
      if (r.status === 'rejected') {
        this.logger.error(`Notificador falhou em ${evento}: ${r.reason}`);
      }
    });
  }
}
