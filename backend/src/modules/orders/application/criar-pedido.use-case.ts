import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  FormaPagamentoPedido,
  OrigemMovimentacao,
  Prisma,
  StatusPedido,
  TipoMovimentacaoEstoque,
} from '@prisma/client';
import { PrismaService } from '@core/database/prisma.service';
import { BusinessRuleError, NotFoundError, ValidationError } from '@core/errors/domain.errors';
import { StockService } from '@modules/stock/application/stock.service';
import { CatalogSessionService } from '@modules/whatsapp/application/catalog-session.service';
import { toNationalDigits } from '@modules/whatsapp/domain/phone.util';
import { CreateOrderDto } from '../presentation/dto/order.dto';
import { IOrderNotifier, ORDER_NOTIFIER, PedidoComItens } from './order-notifier';

/**
 * Cria um pedido vindo do catálogo público (WhatsApp):
 *  1. idempotência: mesma chave → retorna o pedido já criado (anti duplo clique);
 *  2. valida produtos ativos e recalcula TODOS os preços no servidor
 *     (preço promocional quando houver — payload do cliente nunca dita valor);
 *  3. baixa o estoque via StockService (rollback total se faltar saldo);
 *  4. vincula/cria o Cliente automaticamente pelo telefone;
 *  5. grava snapshot completo (nome, preços, endereço) + histórico RECEBIDO.
 * Notificação (WhatsApp/PDV) é disparada após o commit e nunca falha o pedido.
 */
@Injectable()
export class CriarPedidoUseCase {
  private readonly logger = new Logger(CriarPedidoUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: StockService,
    private readonly sessions: CatalogSessionService,
    @Inject(ORDER_NOTIFIER) private readonly notifier: IOrderNotifier,
  ) {}

  async execute(dto: CreateOrderDto): Promise<{ id: string; numero: number; trackingToken: string; total: number }> {
    // Antes de qualquer coisa: o pedido só vale se vier de um link de WhatsApp
    // válido. `resolver` recusa código inexistente ou vencido.
    //
    // O 401 dele é convertido em erro de validação de propósito: esta rota é
    // pública e o catálogo usa o mesmo cliente HTTP do admin, cujo interceptor
    // trata 401 como "sessão do operador caiu" e faz logout. Sem a conversão,
    // o dono da loja abrir o catálogo com um link vencido derrubaria a própria
    // sessão do painel.
    const sessao = await this.sessions.resolver(dto.sessionToken).catch(() => {
      throw new ValidationError(
        'Link expirado ou inválido. Envie uma mensagem no WhatsApp para receber um novo.',
      );
    });

    // O telefone gravado é o da sessão, não o do formulário: o campo chega
    // preenchido e bloqueado no catálogo, então divergência aqui significa
    // payload adulterado — alguém tentando emitir pedido no nome de outro
    // número. Comparação normalizada porque a sessão guarda o nacional
    // (DDD+número) e o cliente pode mandar com o 55 na frente.
    if (toNationalDigits(dto.telefone) !== toNationalDigits(sessao.telefone)) {
      throw new ValidationError(
        'O telefone informado não confere com o do link recebido no WhatsApp.',
      );
    }
    const telefone = toNationalDigits(sessao.telefone);

    if (dto.idempotencyKey) {
      const existente = await this.prisma.pedido.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (existente) {
        return {
          id: existente.id,
          numero: existente.numero,
          trackingToken: existente.trackingToken,
          total: Number(existente.total),
        };
      }
    }

    const pedido = await this.prisma.$transaction(async (tx) => {
      // Preços e disponibilidade sempre do banco.
      const itensCalculados = [];
      let subtotal = 0;
      for (const item of dto.itens) {
        const produto = await tx.produto.findUnique({ where: { id: item.produtoId } });
        if (!produto) throw new NotFoundError('Produto', item.produtoId);
        if (!produto.ativo) throw new BusinessRuleError(`Produto indisponível: ${produto.nome}`);

        const precoVenda = Number(produto.precoVenda);
        const promocional = produto.precoPromocional ? Number(produto.precoPromocional) : null;
        const precoUnitario = promocional !== null && promocional < precoVenda ? promocional : precoVenda;

        const sub = Number((precoUnitario * item.quantidade).toFixed(2));
        subtotal += sub;
        itensCalculados.push({
          produtoId: produto.id,
          nomeProduto: produto.nome,
          quantidade: item.quantidade,
          precoUnitario,
          subtotal: sub,
        });
      }
      subtotal = Number(subtotal.toFixed(2));
      const total = subtotal; // taxa de entrega: evolução futura

      if (dto.formaPagamento === FormaPagamentoPedido.DINHEIRO) {
        if (dto.trocoPara !== undefined && dto.trocoPara < total) {
          throw new ValidationError('Valor do troco não pode ser menor que o total do pedido.');
        }
      }

      // Cliente automático pelo telefone (cadastro sem fricção).
      let cliente = await tx.cliente.findFirst({ where: { telefone } });
      if (!cliente) {
        cliente = await tx.cliente.create({
          data: {
            nome: dto.nome,
            telefone,
            endereco: `${dto.logradouro}, ${dto.numeroEndereco} - ${dto.bairro}, ${dto.cidade}`,
          },
        });
      }

      const criado = await tx.pedido.create({
        data: {
          idempotencyKey: dto.idempotencyKey,
          clienteId: cliente.id,
          nomeCliente: dto.nome,
          telefone,
          logradouro: dto.logradouro,
          numeroEndereco: dto.numeroEndereco,
          complemento: dto.complemento,
          bairro: dto.bairro,
          cidade: dto.cidade,
          referencia: dto.referencia,
          formaPagamento: dto.formaPagamento,
          trocoPara: dto.formaPagamento === FormaPagamentoPedido.DINHEIRO ? dto.trocoPara : null,
          subtotal,
          total,
          observacoes: dto.observacoes,
          status: StatusPedido.RECEBIDO,
          itens: { create: itensCalculados },
          historico: { create: { status: StatusPedido.RECEBIDO } },
        },
        include: { itens: true },
      });

      // Baixa de estoque (lança EstoqueInsuficienteError → rollback de tudo).
      for (const item of itensCalculados) {
        await this.stock.applyMovement(tx, {
          produtoId: item.produtoId,
          delta: -item.quantidade,
          tipo: TipoMovimentacaoEstoque.SAIDA,
          origem: OrigemMovimentacao.PEDIDO_WHATSAPP,
          motivo: `Pedido WhatsApp #${criado.numero}`,
          referenciaId: criado.id,
        });
      }

      return criado;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    this.notifier.orderCreated(pedido as PedidoComItens).catch((err) => {
      this.logger.error(`Falha ao notificar criação do pedido #${pedido.numero}`, err);
    });

    return {
      id: pedido.id,
      numero: pedido.numero,
      trackingToken: pedido.trackingToken,
      total: Number(pedido.total),
    };
  }
}
