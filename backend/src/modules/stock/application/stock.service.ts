import { Injectable } from '@nestjs/common';
import {
  MovimentacaoEstoque,
  OrigemMovimentacao,
  Prisma,
  TipoMovimentacaoEstoque,
} from '@prisma/client';
import { PrismaService } from '@core/database/prisma.service';
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
    const produto = await tx.produto.findUnique({ where: { id: params.produtoId } });
    if (!produto) throw new NotFoundError('Produto', params.produtoId);

    const anterior = Number(produto.estoque);
    const resultante = anterior + params.delta;

    if (resultante < 0) {
      throw new EstoqueInsuficienteError(produto.nome);
    }

    await tx.produto.update({
      where: { id: params.produtoId },
      data: { estoque: resultante },
    });

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
    return this.prisma.$transaction(async (tx) => {
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
    });
  }
}
