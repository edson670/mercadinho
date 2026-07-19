import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@core/database/prisma.service';
import { PaginatedResponseDto } from '@core/common/dto/paginated-response.dto';
import { NotFoundError } from '@core/errors/domain.errors';
import { OrderQueryDto } from '../presentation/dto/order.dto';

@Injectable()
export class OrdersQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: OrderQueryDto) {
    const where: Prisma.PedidoWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.formaPagamento ? { formaPagamento: query.formaPagamento } : {}),
      ...(query.search
        ? {
            OR: [
              { nomeCliente: { contains: query.search, mode: 'insensitive' } },
              { telefone: { contains: query.search.replace(/\D/g, '') || query.search } },
            ],
          }
        : {}),
      ...(query.from || query.to
        ? {
            criadoEm: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.pedido.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { criadoEm: 'desc' },
        include: { _count: { select: { itens: true } } },
      }),
      this.prisma.pedido.count({ where }),
    ]);

    const data = rows.map((p) => ({
      id: p.id,
      numero: p.numero,
      nomeCliente: p.nomeCliente,
      telefone: p.telefone,
      bairro: p.bairro,
      formaPagamento: p.formaPagamento,
      status: p.status,
      total: Number(p.total),
      itensCount: p._count.itens,
      criadoEm: p.criadoEm,
    }));
    return new PaginatedResponseDto(data, total, query.page, query.limit);
  }

  async detail(id: string) {
    const p = await this.prisma.pedido.findUnique({
      where: { id },
      include: {
        itens: true,
        historico: {
          orderBy: { criadoEm: 'asc' },
          include: { usuario: { select: { nome: true } } },
        },
      },
    });
    if (!p) throw new NotFoundError('Pedido', id);
    return this.toDetail(p);
  }

  /** Acompanhamento público pelo cliente, via token opaco (sem login). */
  async publicStatus(trackingToken: string) {
    const p = await this.prisma.pedido.findUnique({
      where: { trackingToken },
      include: { historico: { orderBy: { criadoEm: 'asc' } }, itens: true },
    });
    if (!p) throw new NotFoundError('Pedido');
    return {
      numero: p.numero,
      status: p.status,
      total: Number(p.total),
      formaPagamento: p.formaPagamento,
      criadoEm: p.criadoEm,
      itens: p.itens.map((i) => ({
        nomeProduto: i.nomeProduto,
        quantidade: Number(i.quantidade),
        subtotal: Number(i.subtotal),
      })),
      historico: p.historico.map((h) => ({ status: h.status, criadoEm: h.criadoEm })),
    };
  }

  private toDetail(p: {
    id: string;
    numero: number;
    nomeCliente: string;
    telefone: string;
    logradouro: string;
    numeroEndereco: string;
    complemento: string | null;
    bairro: string;
    cidade: string;
    referencia: string | null;
    formaPagamento: string;
    trocoPara: Prisma.Decimal | null;
    subtotal: Prisma.Decimal;
    total: Prisma.Decimal;
    status: string;
    observacoes: string | null;
    criadoEm: Date;
    itens: {
      produtoId: string;
      nomeProduto: string;
      quantidade: Prisma.Decimal;
      precoUnitario: Prisma.Decimal;
      subtotal: Prisma.Decimal;
    }[];
    historico: { status: string; criadoEm: Date; usuario?: { nome: string } | null }[];
  }) {
    return {
      id: p.id,
      numero: p.numero,
      nomeCliente: p.nomeCliente,
      telefone: p.telefone,
      endereco: {
        logradouro: p.logradouro,
        numero: p.numeroEndereco,
        complemento: p.complemento,
        bairro: p.bairro,
        cidade: p.cidade,
        referencia: p.referencia,
      },
      formaPagamento: p.formaPagamento,
      trocoPara: p.trocoPara ? Number(p.trocoPara) : null,
      subtotal: Number(p.subtotal),
      total: Number(p.total),
      status: p.status,
      observacoes: p.observacoes,
      criadoEm: p.criadoEm,
      itens: p.itens.map((i) => ({
        produtoId: i.produtoId,
        nomeProduto: i.nomeProduto,
        quantidade: Number(i.quantidade),
        precoUnitario: Number(i.precoUnitario),
        subtotal: Number(i.subtotal),
      })),
      historico: p.historico.map((h) => ({
        status: h.status,
        usuarioNome: h.usuario?.nome ?? null,
        criadoEm: h.criadoEm,
      })),
    };
  }
}
