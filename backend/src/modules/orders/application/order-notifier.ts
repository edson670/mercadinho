import { Injectable, Logger } from '@nestjs/common';
import { Pedido, StatusPedido } from '@prisma/client';

export const ORDER_NOTIFIER = Symbol('ORDER_NOTIFIER');

export type PedidoComItens = Pedido & {
  itens: { nomeProduto: string; quantidade: unknown; precoUnitario: unknown }[];
};

/**
 * Porta de notificação de eventos de pedido.
 * W1: implementação nula (sistema funciona sem WhatsApp).
 * W2: EvolutionWhatsAppNotifier envia as mensagens automáticas.
 * W4: gateway Socket.IO também é notificado (composição).
 * Implementações NUNCA devem lançar — falha de notificação não pode
 * derrubar a criação/atualização do pedido.
 */
export interface IOrderNotifier {
  orderCreated(pedido: PedidoComItens): Promise<void>;
  orderStatusChanged(pedido: Pedido, novoStatus: StatusPedido): Promise<void>;
}

@Injectable()
export class NoopOrderNotifier implements IOrderNotifier {
  private readonly logger = new Logger(NoopOrderNotifier.name);

  async orderCreated(pedido: PedidoComItens): Promise<void> {
    this.logger.log(`[noop] pedido criado #${pedido.numero}`);
  }

  async orderStatusChanged(pedido: Pedido, novoStatus: StatusPedido): Promise<void> {
    this.logger.log(`[noop] pedido #${pedido.numero} → ${novoStatus}`);
  }
}
