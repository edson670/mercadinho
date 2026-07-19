import { Injectable } from '@nestjs/common';
import { Pedido, StatusPedido } from '@prisma/client';
import { IOrderNotifier, PedidoComItens } from '@modules/orders/application/order-notifier';
import { WhatsAppMessengerService } from './whatsapp-messenger.service';
import { pedidoRecebido, statusAtualizado } from './message-templates';

/** Traduz eventos de pedido em mensagens de WhatsApp para o cliente. */
@Injectable()
export class WhatsAppOrderNotifier implements IOrderNotifier {
  constructor(private readonly messenger: WhatsAppMessengerService) {}

  async orderCreated(pedido: PedidoComItens): Promise<void> {
    const mensagem = pedidoRecebido({
      numero: pedido.numero,
      total: Number(pedido.total),
      formaPagamento: pedido.formaPagamento,
      trocoPara: pedido.trocoPara ? Number(pedido.trocoPara) : null,
      itens: pedido.itens.map((i) => ({
        nomeProduto: i.nomeProduto,
        quantidade: Number(i.quantidade),
        subtotal: Number(i.subtotal),
      })),
    });
    await this.messenger.send(pedido.telefone, mensagem, pedido.id);
  }

  async orderStatusChanged(pedido: Pedido, novoStatus: StatusPedido): Promise<void> {
    const mensagem = statusAtualizado(novoStatus, pedido.numero);
    if (!mensagem) return;
    await this.messenger.send(pedido.telefone, mensagem, pedido.id);
  }
}
