import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@core/database/prisma.service';
import { PaginatedResponseDto } from '@core/common/dto/paginated-response.dto';
import { NotFoundError } from '@core/errors/domain.errors';
import {
  PurchaseDetailDto,
  PurchaseListItemDto,
  PurchaseQueryDto,
} from '../presentation/dto/purchase.dto';

@Injectable()
export class PurchasesQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: PurchaseQueryDto): Promise<PaginatedResponseDto<PurchaseListItemDto>> {
    const where: Prisma.CompraWhereInput = {
      ...(query.fornecedorId ? { fornecedorId: query.fornecedorId } : {}),
      ...(query.from || query.to
        ? {
            data: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.compra.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { data: 'desc' },
        include: {
          fornecedor: { select: { nome: true } },
          usuario: { select: { nome: true } },
          _count: { select: { itens: true } },
        },
      }),
      this.prisma.compra.count({ where }),
    ]);

    const data: PurchaseListItemDto[] = rows.map((c) => ({
      id: c.id,
      fornecedorNome: c.fornecedor.nome,
      valorTotal: Number(c.valorTotal),
      itensCount: c._count.itens,
      usuarioNome: c.usuario?.nome ?? null,
      data: c.data,
    }));

    return new PaginatedResponseDto(data, total, query.page, query.limit);
  }

  async detail(id: string): Promise<PurchaseDetailDto> {
    const compra = await this.prisma.compra.findUnique({
      where: { id },
      include: {
        fornecedor: { select: { id: true, nome: true } },
        usuario: { select: { nome: true } },
        itens: { include: { produto: { select: { nome: true } } } },
      },
    });
    if (!compra) throw new NotFoundError('Compra', id);

    return {
      id: compra.id,
      fornecedorId: compra.fornecedor.id,
      fornecedorNome: compra.fornecedor.nome,
      valorTotal: Number(compra.valorTotal),
      observacoes: compra.observacoes,
      usuarioNome: compra.usuario?.nome ?? null,
      data: compra.data,
      itens: compra.itens.map((i) => ({
        produtoId: i.produtoId,
        produtoNome: i.produto.nome,
        quantidade: Number(i.quantidade),
        precoUnitario: Number(i.precoUnitario),
        subtotal: Number(i.subtotal),
      })),
    };
  }
}
