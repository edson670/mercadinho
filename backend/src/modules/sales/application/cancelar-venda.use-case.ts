import { Injectable } from '@nestjs/common';
import { OrigemMovimentacao, StatusVenda, TipoMovimentacaoEstoque } from '@prisma/client';
import { PrismaService } from '@core/database/prisma.service';
import { BusinessRuleError, NotFoundError } from '@core/errors/domain.errors';
import { StockService } from '@modules/stock/application/stock.service';

/**
 * Cancela uma venda e estorna o estoque (movimentação de ENTRADA).
 * Vendas fiado com pagamentos registrados não podem ser canceladas.
 */
@Injectable()
export class CancelarVendaUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: StockService,
  ) {}

  async execute(vendaId: string, usuarioId: string): Promise<{ id: string }> {
    const venda = await this.prisma.vendaModel.findUnique({
      where: { id: vendaId },
      include: { itens: true, fiado: { include: { pagamentos: true } } },
    });
    if (!venda) throw new NotFoundError('Venda', vendaId);
    if (venda.status === StatusVenda.CANCELADA) {
      throw new BusinessRuleError('Venda já está cancelada.');
    }
    if (venda.fiado && venda.fiado.pagamentos.length > 0) {
      throw new BusinessRuleError(
        'Venda fiado com pagamentos registrados não pode ser cancelada.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // A transição para CANCELADA vem ANTES do estorno e é condicional: a
      // checagem lá em cima acontece fora da transação, então dois pedidos de
      // cancelamento simultâneos passavam os dois por ela e o estoque era
      // devolvido em dobro. Só quem efetivamente muda o status estorna.
      const { count } = await tx.vendaModel.updateMany({
        where: { id: venda.id, status: { not: StatusVenda.CANCELADA } },
        data: { status: StatusVenda.CANCELADA },
      });
      if (count === 0) throw new BusinessRuleError('Venda já está cancelada.');

      // Estorna o estoque de cada item.
      for (const item of venda.itens) {
        await this.stock.applyMovement(tx, {
          produtoId: item.produtoId,
          delta: Number(item.quantidade),
          tipo: TipoMovimentacaoEstoque.ENTRADA,
          origem: OrigemMovimentacao.CANCELAMENTO,
          usuarioId,
          motivo: `Cancelamento venda #${venda.numero}`,
          referenciaId: venda.id,
        });
      }

      // Remove o fiado (sem pagamentos) associado, se houver.
      if (venda.fiado) {
        await tx.fiado.delete({ where: { id: venda.fiado.id } });
      }

      return { id: venda.id };
    });
  }
}
