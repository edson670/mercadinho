import { Injectable } from '@nestjs/common';
import {
  MovimentacaoEstoque,
  OrigemMovimentacao,
  Prisma,
  TipoMovimentacaoEstoque,
} from '@prisma/client';
import { PrismaService } from '@core/database/prisma.service';
import { comRetrySerializacao } from '@core/database/serializable.util';
import { EstoqueInsuficienteError, NotFoundError } from '@core/errors/domain.errors';

export interface ApplyMovementParams {
  produtoId: string;
  /** Delta assinado: positivo aumenta, negativo reduz o estoque. */
  delta: number;
  tipo: TipoMovimentacaoEstoque;
  origem: OrigemMovimentacao;
  /** Ausente = movimentação originada pelo sistema (ex.: pedido público WhatsApp). */
  usuarioId?: string;
  motivo?: string;
  referenciaId?: string;
}

/**
 * Núcleo do controle de estoque.
 * `applyMovement` é a ÚNICA forma de alterar o saldo de um produto:
 * grava um registro imutável em MovimentacaoEstoque e recalcula o saldo
 * na mesma transação. Reutilizado por Compras, Vendas e ajustes.
 */
@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  async applyMovement(
    tx: Prisma.TransactionClient,
    params: ApplyMovementParams,
  ): Promise<MovimentacaoEstoque> {
    // Atualização condicional atômica em vez de ler → calcular → gravar.
    // A checagem de saldo viaja DENTRO do `where` do próprio UPDATE: quando
    // duas baixas do mesmo produto acontecem juntas, a segunda espera o lock
    // da primeira e o Postgres reavalia o `where` contra o valor já atualizado.
    // Com o read-modify-write anterior, as duas liam o mesmo saldo e a segunda
    // sobrescrevia a primeira — vendia dois e baixava um só.
    const ehBaixa = params.delta < 0;
    const { count } = await tx.produto.updateMany({
      where: {
        id: params.produtoId,
        ...(ehBaixa ? { estoque: { gte: Math.abs(params.delta) } } : {}),
      },
      data: { estoque: { increment: params.delta } },
    });

    if (count === 0) {
      const existente = await tx.produto.findUnique({
        where: { id: params.produtoId },
        select: { nome: true },
      });
      if (!existente) throw new NotFoundError('Produto', params.produtoId);
      throw new EstoqueInsuficienteError(existente.nome);
    }

    const { estoque } = await tx.produto.findUniqueOrThrow({
      where: { id: params.produtoId },
      select: { estoque: true },
    });
    const resultante = Number(estoque);
    // O saldo anterior é derivado do resultado, não de uma leitura prévia —
    // é o único valor coerente com o UPDATE que de fato aconteceu.
    const anterior = Number((resultante - params.delta).toFixed(3));

    return tx.movimentacaoEstoque.create({
      data: {
        produtoId: params.produtoId,
        tipo: params.tipo,
        origem: params.origem,
        quantidade: Math.abs(params.delta),
        estoqueAnterior: anterior,
        estoqueResultante: resultante,
        motivo: params.motivo,
        referenciaId: params.referenciaId,
        usuarioId: params.usuarioId,
      },
    });
  }

  /** Entrada manual de estoque (reforço/acerto positivo). */
  async registerEntry(produtoId: string, quantidade: number, usuarioId: string, motivo?: string) {
    return this.prisma.$transaction((tx) =>
      this.applyMovement(tx, {
        produtoId,
        delta: Math.abs(quantidade),
        tipo: TipoMovimentacaoEstoque.ENTRADA,
        origem: OrigemMovimentacao.AJUSTE_MANUAL,
        usuarioId,
        motivo: motivo ?? 'Entrada manual',
      }),
    );
  }

  /** Ajuste para uma quantidade absoluta (correção de inventário). */
  async adjust(produtoId: string, novaQuantidade: number, usuarioId: string, motivo: string) {
    // Aqui o delta é derivado de uma leitura, então a atomicidade do
    // `applyMovement` não basta: se uma venda acontecer entre a leitura e a
    // gravação, o estoque final não é o valor que o operador digitou. Sob
    // Serializable o banco recusa a transação nesse caso, em vez de gravar
    // um número errado em silêncio.
    return comRetrySerializacao(() =>
      this.prisma.$transaction(
        async (tx) => {
          const produto = await tx.produto.findUnique({ where: { id: produtoId } });
          if (!produto) throw new NotFoundError('Produto', produtoId);
          const delta = novaQuantidade - Number(produto.estoque);
          return this.applyMovement(tx, {
            produtoId,
            delta,
            tipo: TipoMovimentacaoEstoque.AJUSTE,
            origem: OrigemMovimentacao.AJUSTE_MANUAL,
            usuarioId,
            motivo,
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ),
    );
  }
}
