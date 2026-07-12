import { Inject, Injectable } from '@nestjs/common';
import {
  FormaPagamento,
  OrigemMovimentacao,
  StatusCaixa,
  StatusFiado,
  StatusVenda,
  TipoMovimentacaoEstoque,
} from '@prisma/client';
import { PrismaService } from '@core/database/prisma.service';
import {
  BusinessRuleError,
  CaixaFechadoError,
  NotFoundError,
  ValidationError,
} from '@core/errors/domain.errors';
import { StockService } from '@modules/stock/application/stock.service';
import { ICustomerRepository, CUSTOMER_REPOSITORY } from '@modules/customers/domain/customer.repository';
import { CreateSaleDto } from '../presentation/dto/sale.dto';

/**
 * Finaliza uma venda de forma transacional:
 *  1. exige um caixa ABERTO do operador;
 *  2. valida itens/estoque e calcula subtotal/desconto/total;
 *  3. cria a venda + itens e baixa o estoque (via StockService);
 *  4. se FIADO, exige cliente e gera o registro de Fiado.
 * Qualquer falha (ex.: estoque insuficiente) desfaz tudo.
 */
@Injectable()
export class FinalizarVendaUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: StockService,
    @Inject(CUSTOMER_REPOSITORY) private readonly customers: ICustomerRepository,
  ) {}

  async execute(dto: CreateSaleDto, usuarioId: string): Promise<{ id: string }> {
    const caixa = await this.prisma.caixa.findFirst({
      where: { usuarioId, status: StatusCaixa.ABERTO },
    });
    if (!caixa) throw new CaixaFechadoError();

    if (dto.formaPagamento === FormaPagamento.FIADO) {
      if (!dto.clienteId) {
        throw new ValidationError('Selecione um cliente para venda fiado.');
      }
      const cliente = await this.customers.findById(dto.clienteId);
      if (!cliente) throw new NotFoundError('Cliente', dto.clienteId);
      if (!cliente.ativo) throw new BusinessRuleError('Cliente inativo.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Monta os itens com o preço de venda atual e valida os produtos.
      const itensCalculados = [];
      let subtotal = 0;
      for (const item of dto.itens) {
        const produto = await tx.produto.findUnique({ where: { id: item.produtoId } });
        if (!produto) throw new NotFoundError('Produto', item.produtoId);
        if (!produto.ativo) throw new BusinessRuleError(`Produto inativo: ${produto.nome}`);

        const precoUnitario = Number(produto.precoVenda);
        const sub = Number((precoUnitario * item.quantidade).toFixed(2));
        subtotal += sub;
        itensCalculados.push({
          produtoId: produto.id,
          quantidade: item.quantidade,
          precoUnitario,
          subtotal: sub,
        });
      }
      subtotal = Number(subtotal.toFixed(2));

      const desconto = Number((dto.desconto ?? 0).toFixed(2));
      if (desconto > subtotal) {
        throw new ValidationError('Desconto não pode ser maior que o subtotal.');
      }
      const total = Number((subtotal - desconto).toFixed(2));

      const venda = await tx.vendaModel.create({
        data: {
          clienteId: dto.clienteId ?? null,
          usuarioId,
          caixaId: caixa.id,
          subtotal,
          desconto,
          total,
          formaPagamento: dto.formaPagamento,
          status: StatusVenda.CONCLUIDA,
        },
      });

      for (const item of itensCalculados) {
        await tx.itemVenda.create({
          data: {
            vendaId: venda.id,
            produtoId: item.produtoId,
            quantidade: item.quantidade,
            precoUnitario: item.precoUnitario,
            subtotal: item.subtotal,
          },
        });

        // Baixa de estoque (valida saldo; lança EstoqueInsuficienteError se faltar).
        await this.stock.applyMovement(tx, {
          produtoId: item.produtoId,
          delta: -item.quantidade,
          tipo: TipoMovimentacaoEstoque.SAIDA,
          origem: OrigemMovimentacao.VENDA,
          usuarioId,
          motivo: `Venda #${venda.numero}`,
          referenciaId: venda.id,
        });
      }

      if (dto.formaPagamento === FormaPagamento.FIADO) {
        await tx.fiado.create({
          data: {
            clienteId: dto.clienteId!,
            vendaId: venda.id,
            valorOriginal: total,
            valorPago: 0,
            saldo: total,
            status: StatusFiado.ABERTO,
          },
        });
      }

      return { id: venda.id };
    });
  }
}
