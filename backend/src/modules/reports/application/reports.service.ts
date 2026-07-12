import { BadRequestException, Injectable } from '@nestjs/common';
import { StatusVenda } from '@prisma/client';
import { PrismaService } from '@core/database/prisma.service';
import { formatCurrency, formatDate, formatDateTime } from '@core/common/format.util';
import type { TabularReport } from './pdf-export.service';

export type ReportType = 'sales' | 'products' | 'stock' | 'purchases' | 'customers' | 'credit';

const REPORT_TITLES: Record<ReportType, string> = {
  sales: 'Relatório de Vendas',
  products: 'Relatório de Produtos',
  stock: 'Relatório de Movimentações de Estoque',
  purchases: 'Relatório de Compras',
  customers: 'Relatório de Clientes',
  credit: 'Relatório de Fiado',
};

/** Monta os dados tabulares de cada relatório a partir do banco (sem paginação — traz o período todo). */
@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async build(type: ReportType, from?: string, to?: string): Promise<TabularReport> {
    const range = this.dateRange(from, to);
    const subtitle = from || to ? `Período: ${from ? formatDate(from) : '...'} a ${to ? formatDate(to) : '...'}` : undefined;

    const rows = await this.rowsFor(type, range);
    return {
      title: REPORT_TITLES[type],
      subtitle,
      columns: this.columnsFor(type),
      rows,
    };
  }

  private dateRange(from?: string, to?: string) {
    if (!from && !to) return undefined;
    const gte = from ? new Date(from) : undefined;
    const lte = to ? new Date(to) : undefined;
    if ((from && isNaN(gte!.getTime())) || (to && isNaN(lte!.getTime()))) {
      throw new BadRequestException('Datas inválidas.');
    }
    return { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) };
  }

  private columnsFor(type: ReportType): string[] {
    switch (type) {
      case 'sales':
        return ['Número', 'Data', 'Cliente', 'Forma de pagamento', 'Status', 'Total'];
      case 'products':
        return ['Nome', 'Categoria', 'Código de barras', 'Preço venda', 'Estoque', 'Estoque mínimo', 'Status'];
      case 'stock':
        return ['Data', 'Produto', 'Tipo', 'Origem', 'Quantidade', 'Saldo resultante'];
      case 'purchases':
        return ['Data', 'Fornecedor', 'Itens', 'Valor total'];
      case 'customers':
        return ['Nome', 'CPF', 'Telefone', 'Status'];
      case 'credit':
        return ['Cliente', 'Venda', 'Valor original', 'Valor pago', 'Saldo', 'Status'];
    }
  }

  private async rowsFor(
    type: ReportType,
    range?: { gte?: Date; lte?: Date },
  ): Promise<(string | number)[][]> {
    switch (type) {
      case 'sales': {
        const vendas = await this.prisma.vendaModel.findMany({
          where: { status: StatusVenda.CONCLUIDA, ...(range ? { data: range } : {}) },
          orderBy: { data: 'desc' },
          include: { cliente: { select: { nome: true } } },
        });
        return vendas.map((v) => [
          v.numero,
          formatDateTime(v.data),
          v.cliente?.nome ?? 'Consumidor',
          v.formaPagamento,
          v.status,
          formatCurrency(v.total),
        ]);
      }
      case 'products': {
        const produtos = await this.prisma.produto.findMany({
          orderBy: { nome: 'asc' },
          include: { categoria: { select: { nome: true } } },
        });
        return produtos.map((p) => [
          p.nome,
          p.categoria.nome,
          p.codigoBarras ?? '—',
          formatCurrency(p.precoVenda),
          Number(p.estoque),
          Number(p.estoqueMinimo),
          p.ativo ? 'Ativo' : 'Inativo',
        ]);
      }
      case 'stock': {
        const movs = await this.prisma.movimentacaoEstoque.findMany({
          where: range ? { criadoEm: range } : undefined,
          orderBy: { criadoEm: 'desc' },
          include: { produto: { select: { nome: true } } },
        });
        return movs.map((m) => [
          formatDateTime(m.criadoEm),
          m.produto.nome,
          m.tipo,
          m.origem,
          Number(m.quantidade),
          Number(m.estoqueResultante),
        ]);
      }
      case 'purchases': {
        const compras = await this.prisma.compra.findMany({
          where: range ? { data: range } : undefined,
          orderBy: { data: 'desc' },
          include: { fornecedor: { select: { nome: true } }, _count: { select: { itens: true } } },
        });
        return compras.map((c) => [
          formatDateTime(c.data),
          c.fornecedor.nome,
          c._count.itens,
          formatCurrency(c.valorTotal),
        ]);
      }
      case 'customers': {
        const clientes = await this.prisma.cliente.findMany({ orderBy: { nome: 'asc' } });
        return clientes.map((c) => [
          c.nome,
          c.cpf ?? '—',
          c.telefone ?? '—',
          c.ativo ? 'Ativo' : 'Inativo',
        ]);
      }
      case 'credit': {
        const fiados = await this.prisma.fiado.findMany({
          where: range ? { criadoEm: range } : undefined,
          orderBy: { criadoEm: 'desc' },
          include: { cliente: { select: { nome: true } }, venda: { select: { numero: true } } },
        });
        return fiados.map((f) => [
          f.cliente.nome,
          f.venda ? `#${f.venda.numero}` : '—',
          formatCurrency(f.valorOriginal),
          formatCurrency(f.valorPago),
          formatCurrency(f.saldo),
          f.status,
        ]);
      }
    }
  }
}
