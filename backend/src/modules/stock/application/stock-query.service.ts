import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@core/database/prisma.service';
import { PaginatedResponseDto } from '@core/common/dto/paginated-response.dto';
import {
  LowStockItemDto,
  MovementQueryDto,
  MovementResponseDto,
} from '../presentation/dto/stock.dto';

@Injectable()
export class StockQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async listMovements(
    query: MovementQueryDto,
  ): Promise<PaginatedResponseDto<MovementResponseDto>> {
    const where: Prisma.MovimentacaoEstoqueWhereInput = {
      ...(query.produtoId ? { produtoId: query.produtoId } : {}),
      ...(query.tipo ? { tipo: query.tipo } : {}),
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
      this.prisma.movimentacaoEstoque.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { criadoEm: 'desc' },
        include: {
          produto: { select: { nome: true } },
          usuario: { select: { nome: true } },
        },
      }),
      this.prisma.movimentacaoEstoque.count({ where }),
    ]);

    const data: MovementResponseDto[] = rows.map((m) => ({
      id: m.id,
      produtoId: m.produtoId,
      produtoNome: m.produto.nome,
      tipo: m.tipo,
      origem: m.origem,
      quantidade: Number(m.quantidade),
      estoqueAnterior: Number(m.estoqueAnterior),
      estoqueResultante: Number(m.estoqueResultante),
      motivo: m.motivo,
      usuarioNome: m.usuario?.nome ?? null,
      criadoEm: m.criadoEm,
    }));

    return new PaginatedResponseDto(data, total, query.page, query.limit);
  }

  /** Produtos ativos com saldo igual ou abaixo do mínimo. */
  async listLowStock(): Promise<LowStockItemDto[]> {
    const produtos = await this.prisma.produto.findMany({
      where: { ativo: true },
      include: { categoria: { select: { nome: true } } },
      orderBy: { nome: 'asc' },
    });

    return produtos
      .filter((p) => Number(p.estoque) <= Number(p.estoqueMinimo))
      .map((p) => ({
        id: p.id,
        nome: p.nome,
        categoriaNome: p.categoria.nome,
        estoque: Number(p.estoque),
        estoqueMinimo: Number(p.estoqueMinimo),
        unidade: p.unidade,
      }));
  }
}
