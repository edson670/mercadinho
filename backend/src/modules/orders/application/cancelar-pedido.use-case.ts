import { Inject, Injectable, Logger } from '@nestjs/common';
import { OrigemMovimentacao, StatusPedido, TipoMovimentacaoEstoque } from '@prisma/client';
import { PrismaService } from '@core/database/prisma.service';
import { BusinessRuleError, NotFoundError } from '@core/errors/domain.errors';
import { StockService } from '@modules/stock/application/stock.service';
import { IOrderNotifier, ORDER_NOTIFIER } from './order-notifier';

/** Cancela um pedido e estorna o estoque de cada item, transacionalmente. */
@Injectable()
export class CancelarPedidoUseCase {
  private readonly logger = new Logger(CancelarPedidoUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: StockService,
    @Inject(ORDER_NOTIFIER) private readonly notifier: IOrderNotifier,
  ) {}

  async execute(pedidoId: string, usuarioId: string) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: { itens: true },
    });
    if (!pedido) throw new NotFoundError('Pedido', pedidoId);
    if (pedido.status === StatusPedido.CANCELADO) {
      throw new BusinessRuleError('Pedido já está cancelado.');
    }
    if (pedido.status === StatusPedido.ENTREGUE) {
      throw new BusinessRuleError('Pedido entregue não pode ser cancelado.');
    }

    const atualizado = await this.prisma.$transaction(async (tx) => {
      // Transição condicional antes do estorno: as checagens acima rodam fora
      // da transação, então dois cancelamentos simultâneos devolviam o estoque
      // duas vezes. Só quem consegue mudar o status é que estorna.
      const { count } = await tx.pedido.updateMany({
        where: { id: pedidoId, status: { not: StatusPedido.CANCELADO } },
        data: { status: StatusPedido.CANCELADO },
      });
      if (count === 0) throw new BusinessRuleError('Pedido já está cancelado.');

      for (const item of pedido.itens) {
        await this.stock.applyMovement(tx, {
          produtoId: item.produtoId,
          delta: Number(item.quantidade),
          tipo: TipoMovimentacaoEstoque.ENTRADA,
          origem: OrigemMovimentacao.CANCELAMENTO,
          usuarioId,
          motivo: `Cancelamento pedido WhatsApp #${pedido.numero}`,
          referenciaId: pedido.id,
        });
      }

      await tx.historicoStatusPedido.create({
        data: { pedidoId, status: StatusPedido.CANCELADO, usuarioId },
      });

      return tx.pedido.findUniqueOrThrow({ where: { id: pedidoId } });
    });

    this.notifier.orderStatusChanged(atualizado, StatusPedido.CANCELADO).catch((err) => {
      this.logger.error(`Falha ao notificar cancelamento do pedido #${atualizado.numero}`, err);
    });

    return atualizado;
  }
}
