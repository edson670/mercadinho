import { Injectable } from '@nestjs/common';
import { StatusFiado, StatusVenda } from '@prisma/client';
import { PrismaService } from '@core/database/prisma.service';

export type ChartPeriod = '7d' | '30d' | '12m';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * `completo = false` devolve só o que interessa à operação do balcão.
   * O caixa vê o dashboard (o item está no menu de todos os perfis), mas
   * faturamento acumulado, fiado em aberto e número de inadimplentes são a
   * mesma informação sensível que já é restrita em /sales-chart e
   * /top-products — não faz sentido barrar lá e liberar aqui.
   */
  async summary(completo = true) {
    const now = new Date();
    const inicioHoje = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      vendasDia,
      vendasMes,
      faturado,
      fiadoAberto,
      recebidoFiado,
      produtos,
      ultimasVendas,
      inadimplentes,
    ] = await Promise.all([
      this.prisma.vendaModel.aggregate({
        where: { status: StatusVenda.CONCLUIDA, data: { gte: inicioHoje } },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.vendaModel.aggregate({
        where: { status: StatusVenda.CONCLUIDA, data: { gte: inicioMes } },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.vendaModel.aggregate({
        where: { status: StatusVenda.CONCLUIDA },
        _sum: { total: true },
      }),
      this.prisma.fiado.aggregate({
        where: { status: { in: [StatusFiado.ABERTO, StatusFiado.PARCIAL] } },
        _sum: { saldo: true },
      }),
      this.prisma.pagamentoFiado.aggregate({ _sum: { valor: true } }),
      this.prisma.produto.findMany({
        where: { ativo: true },
        select: { estoque: true, estoqueMinimo: true },
      }),
      this.prisma.vendaModel.findMany({
        where: { status: StatusVenda.CONCLUIDA },
        take: 5,
        orderBy: { data: 'desc' },
        include: { cliente: { select: { nome: true } } },
      }),
      this.prisma.fiado.findMany({
        where: { status: { in: [StatusFiado.ABERTO, StatusFiado.PARCIAL] } },
        select: { clienteId: true },
        distinct: ['clienteId'],
      }),
    ]);

    const produtosEstoqueBaixo = produtos.filter(
      (p) => Number(p.estoque) <= Number(p.estoqueMinimo),
    ).length;

    return {
      vendasDia: Number(vendasDia._sum.total ?? 0),
      qtdVendasDia: vendasDia._count,
      vendasMes: Number(vendasMes._sum.total ?? 0),
      qtdVendasMes: vendasMes._count,
      ...(completo
        ? {
            totalFaturado: Number(faturado._sum.total ?? 0),
            fiadoEmAberto: Number(fiadoAberto._sum.saldo ?? 0),
            totalRecebidoFiado: Number(recebidoFiado._sum.valor ?? 0),
            clientesInadimplentes: inadimplentes.length,
          }
        : {}),
      produtosEstoqueBaixo,
      ultimasVendas: ultimasVendas.map((v) => ({
        id: v.id,
        numero: v.numero,
        clienteNome: v.cliente?.nome ?? null,
        total: Number(v.total),
        formaPagamento: v.formaPagamento,
        data: v.data,
      })),
    };
  }

  async salesChart(period: ChartPeriod = '7d') {
    const now = new Date();
    const buckets = new Map<string, number>();

    if (period === '12m') {
      const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      for (let i = 0; i < 12; i++) {
        const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
        buckets.set(this.monthKey(d), 0);
      }
      const vendas = await this.prisma.vendaModel.findMany({
        where: { status: StatusVenda.CONCLUIDA, data: { gte: start } },
        select: { data: true, total: true },
      });
      for (const v of vendas) {
        const key = this.monthKey(v.data);
        if (buckets.has(key)) buckets.set(key, buckets.get(key)! + Number(v.total));
      }
    } else {
      const days = period === '30d' ? 30 : 7;
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1));
      for (let i = 0; i < days; i++) {
        const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        buckets.set(this.dayKey(d), 0);
      }
      const vendas = await this.prisma.vendaModel.findMany({
        where: { status: StatusVenda.CONCLUIDA, data: { gte: start } },
        select: { data: true, total: true },
      });
      for (const v of vendas) {
        const key = this.dayKey(v.data);
        if (buckets.has(key)) buckets.set(key, buckets.get(key)! + Number(v.total));
      }
    }

    return [...buckets.entries()].map(([label, total]) => ({
      label,
      total: Number(total.toFixed(2)),
    }));
  }

  async topProducts(limit = 5) {
    const grupos = await this.prisma.itemVenda.groupBy({
      by: ['produtoId'],
      where: { venda: { status: StatusVenda.CONCLUIDA } },
      _sum: { quantidade: true, subtotal: true },
      orderBy: { _sum: { quantidade: 'desc' } },
      take: limit,
    });

    const produtos = await this.prisma.produto.findMany({
      where: { id: { in: grupos.map((g) => g.produtoId) } },
      select: { id: true, nome: true },
    });
    const nomeMap = new Map(produtos.map((p) => [p.id, p.nome]));

    return grupos.map((g) => ({
      produtoId: g.produtoId,
      produtoNome: nomeMap.get(g.produtoId) ?? '—',
      quantidade: Number(g._sum.quantidade ?? 0),
      total: Number(g._sum.subtotal ?? 0),
    }));
  }

  private dayKey(d: Date): string {
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  private monthKey(d: Date): string {
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }
}
