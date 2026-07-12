import { Inject, Injectable } from '@nestjs/common';
import { OrigemMovimentacao, TipoMovimentacaoEstoque } from '@prisma/client';
import { PrismaService } from '@core/database/prisma.service';
import { BusinessRuleError, NotFoundError } from '@core/errors/domain.errors';
import { StockService } from '@modules/stock/application/stock.service';
import { ISupplierRepository, SUPPLIER_REPOSITORY } from '@modules/suppliers/domain/supplier.repository';
import { CreatePurchaseDto } from '../presentation/dto/purchase.dto';

/**
 * Registra uma compra de forma transacional:
 *  1. cria a Compra e seus itens;
 *  2. dá entrada no estoque de cada produto (via StockService);
 *  3. atualiza o preço de compra (último custo) de cada produto.
 * Se qualquer passo falhar, nada é persistido.
 */
@Injectable()
export class RegisterPurchaseUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: StockService,
    @Inject(SUPPLIER_REPOSITORY) private readonly suppliers: ISupplierRepository,
  ) {}

  async execute(dto: CreatePurchaseDto, usuarioId: string): Promise<{ id: string }> {
    const fornecedor = await this.suppliers.findById(dto.fornecedorId);
    if (!fornecedor) throw new NotFoundError('Fornecedor', dto.fornecedorId);
    if (!fornecedor.ativo) throw new BusinessRuleError('Fornecedor inativo.');

    // Valida produtos e calcula total antes da transação.
    const itens = dto.itens.map((i) => ({
      ...i,
      subtotal: Number((i.quantidade * i.precoUnitario).toFixed(2)),
    }));
    const valorTotal = Number(itens.reduce((acc, i) => acc + i.subtotal, 0).toFixed(2));

    return this.prisma.$transaction(async (tx) => {
      const compra = await tx.compra.create({
        data: {
          fornecedorId: dto.fornecedorId,
          usuarioId,
          valorTotal,
          observacoes: dto.observacoes,
        },
      });

      for (const item of itens) {
        await tx.itemCompra.create({
          data: {
            compraId: compra.id,
            produtoId: item.produtoId,
            quantidade: item.quantidade,
            precoUnitario: item.precoUnitario,
            subtotal: item.subtotal,
          },
        });

        // Entrada de estoque (valida existência do produto internamente).
        await this.stock.applyMovement(tx, {
          produtoId: item.produtoId,
          delta: item.quantidade,
          tipo: TipoMovimentacaoEstoque.ENTRADA,
          origem: OrigemMovimentacao.COMPRA,
          usuarioId,
          motivo: `Compra ${compra.id}`,
          referenciaId: compra.id,
        });

        // Atualiza o custo (último preço de compra).
        await tx.produto.update({
          where: { id: item.produtoId },
          data: { precoCompra: item.precoUnitario },
        });
      }

      return { id: compra.id };
    });
  }
}
