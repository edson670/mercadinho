import { Injectable, Logger } from '@nestjs/common';
import { FormaPagamentoPedido, Pedido, StatusPedido } from '@prisma/client';
import { PrismaService } from '@core/database/prisma.service';
import { IOrderNotifier, PedidoComItens } from '@modules/orders/application/order-notifier';
import { WhatsAppMessengerService } from './whatsapp-messenger.service';
import { CatalogSessionService } from './catalog-session.service';
import { pedidoRecebido, statusAtualizado } from './message-templates';

/** Traduz eventos de pedido em mensagens de WhatsApp para o cliente. */
@Injectable()
export class WhatsAppOrderNotifier implements IOrderNotifier {
  private readonly logger = new Logger(WhatsAppOrderNotifier.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messenger: WhatsAppMessengerService,
    private readonly sessions: CatalogSessionService,
  ) {}

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
      endereco: {
        logradouro: pedido.logradouro,
        numeroEndereco: pedido.numeroEndereco,
        complemento: pedido.complemento,
        bairro: pedido.bairro,
        cidade: pedido.cidade,
        referencia: pedido.referencia,
      },
      linkAcompanhamento: this.sessions.linkAcompanhamento(pedido.trackingToken),
      chavePix: pedido.formaPagamento === FormaPagamentoPedido.PIX ? await this.chavePix() : null,
    });
    await this.messenger.send(pedido.telefone, mensagem, pedido.id);
  }

  async orderStatusChanged(pedido: Pedido, novoStatus: StatusPedido): Promise<void> {
    const mensagem = statusAtualizado(novoStatus, pedido.numero, {
      linkAcompanhamento: this.sessions.linkAcompanhamento(pedido.trackingToken),
    });
    if (!mensagem) return;
    await this.messenger.send(pedido.telefone, mensagem, pedido.id);
  }

  /** Ausência de chave não pode impedir a confirmação — só omite o bloco PIX. */
  private async chavePix(): Promise<string | null> {
    try {
      const config = await this.prisma.configuracao.findFirst({ select: { chavePix: true } });
      const chave = config?.chavePix?.trim();
      if (!chave) {
        this.logger.warn('Pedido em PIX sem chave configurada — cliente ficou sem como pagar.');
        return null;
      }
      return chave;
    } catch {
      return null;
    }
  }
}
