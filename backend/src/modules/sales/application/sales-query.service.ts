import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@core/database/prisma.service';
import { PaginatedResponseDto } from '@core/common/dto/paginated-response.dto';
import { NotFoundError } from '@core/errors/domain.errors';
import { SaleDetailDto, SaleListItemDto, SaleQueryDto } from '../presentation/dto/sale.dto';

@Injectable()
export class SalesQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: SaleQueryDto): Promise<PaginatedResponseDto<SaleListItemDto>> {
    const where: Prisma.VendaModelWhereInput = {
      ...(query.clienteId ? { clienteId: query.clienteId } : {}),
      ...(query.formaPagamento ? { formaPagamento: query.formaPagamento } : {}),
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
      this.prisma.vendaModel.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { data: 'desc' },
        include: {
          cliente: { select: { nome: true } },
          usuario: { select: { nome: true } },
        },
      }),
      this.prisma.vendaModel.count({ where }),
    ]);

    const data: SaleListItemDto[] = rows.map((v) => ({
      id: v.id,
      numero: v.numero,
      clienteNome: v.cliente?.nome ?? null,
      usuarioNome: v.usuario?.nome ?? null,
      formaPagamento: v.formaPagamento,
      status: v.status,
      total: Number(v.total),
      data: v.data,
    }));
    return new PaginatedResponseDto(data, total, query.page, query.limit);
  }

  async detail(id: string): Promise<SaleDetailDto> {
    const venda = await this.prisma.vendaModel.findUnique({
      where: { id },
      include: {
        cliente: { select: { nome: true } },
        usuario: { select: { nome: true } },
        itens: { include: { produto: { select: { nome: true } } } },
      },
    });
    if (!venda) throw new NotFoundError('Venda', id);

    return {
      id: venda.id,
      numero: venda.numero,
      clienteNome: venda.cliente?.nome ?? null,
      usuarioNome: venda.usuario?.nome ?? null,
      formaPagamento: venda.formaPagamento,
      status: venda.status,
      subtotal: Number(venda.subtotal),
      desconto: Number(venda.desconto),
      total: Number(venda.total),
      data: venda.data,
      itens: venda.itens.map((i) => ({
        produtoId: i.produtoId,
        produtoNome: i.produto.nome,
        quantidade: Number(i.quantidade),
        precoUnitario: Number(i.precoUnitario),
        subtotal: Number(i.subtotal),
      })),
    };
  }
}
