import { Injectable } from '@nestjs/common';
import { Prisma, StatusFiado } from '@prisma/client';
import { PrismaService } from '@core/database/prisma.service';
import { PaginatedResponseDto } from '@core/common/dto/paginated-response.dto';
import { NotFoundError } from '@core/errors/domain.errors';
import {
  CreditQueryDto,
  FiadoDetailDto,
  FiadoListItemDto,
  OverdueCustomerDto,
} from '../presentation/dto/credit.dto';

@Injectable()
export class CreditQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: CreditQueryDto): Promise<PaginatedResponseDto<FiadoListItemDto>> {
    const where: Prisma.FiadoWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.clienteId ? { clienteId: query.clienteId } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.fiado.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { criadoEm: 'desc' },
        include: {
          cliente: { select: { nome: true } },
          venda: { select: { numero: true } },
        },
      }),
      this.prisma.fiado.count({ where }),
    ]);

    const data: FiadoListItemDto[] = rows.map((f) => ({
      id: f.id,
      clienteId: f.clienteId,
      clienteNome: f.cliente.nome,
      vendaNumero: f.venda?.numero ?? null,
      valorOriginal: Number(f.valorOriginal),
      valorPago: Number(f.valorPago),
      saldo: Number(f.saldo),
      status: f.status,
      criadoEm: f.criadoEm,
    }));
    return new PaginatedResponseDto(data, total, query.page, query.limit);
  }

  async detail(id: string): Promise<FiadoDetailDto> {
    const fiado = await this.prisma.fiado.findUnique({
      where: { id },
      include: {
        cliente: { select: { nome: true } },
        venda: { select: { numero: true } },
        pagamentos: {
          orderBy: { data: 'desc' },
          include: { usuario: { select: { nome: true } } },
        },
      },
    });
    if (!fiado) throw new NotFoundError('Fiado', id);

    return {
      id: fiado.id,
      clienteId: fiado.clienteId,
      clienteNome: fiado.cliente.nome,
      vendaNumero: fiado.venda?.numero ?? null,
      valorOriginal: Number(fiado.valorOriginal),
      valorPago: Number(fiado.valorPago),
      saldo: Number(fiado.saldo),
      status: fiado.status,
      criadoEm: fiado.criadoEm,
      pagamentos: fiado.pagamentos.map((p) => ({
        id: p.id,
        valor: Number(p.valor),
        formaPagamento: p.formaPagamento,
        usuarioNome: p.usuario?.nome ?? null,
        data: p.data,
      })),
    };
  }

  /** Clientes com saldo em aberto, agregado por cliente. */
  async overdue(): Promise<OverdueCustomerDto[]> {
    const abertos = await this.prisma.fiado.findMany({
      where: { status: { in: [StatusFiado.ABERTO, StatusFiado.PARCIAL] } },
      include: { cliente: { select: { id: true, nome: true, telefone: true } } },
    });

    const mapa = new Map<string, OverdueCustomerDto>();
    for (const f of abertos) {
      const atual = mapa.get(f.clienteId);
      if (atual) {
        atual.totalDevido = Number((atual.totalDevido + Number(f.saldo)).toFixed(2));
        atual.quantidadeFiados += 1;
      } else {
        mapa.set(f.clienteId, {
          clienteId: f.clienteId,
          clienteNome: f.cliente.nome,
          telefone: f.cliente.telefone,
          totalDevido: Number(Number(f.saldo).toFixed(2)),
          quantidadeFiados: 1,
        });
      }
    }
    return [...mapa.values()].sort((a, b) => b.totalDevido - a.totalDevido);
  }
}
