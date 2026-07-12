import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@core/database/prisma.service';
import { PaginatedResponseDto } from '@core/common/dto/paginated-response.dto';
import { NotFoundError } from '@core/errors/domain.errors';
import { AuditDetailDto, AuditListItemDto, AuditQueryDto } from '../presentation/dto/audit.dto';

@Injectable()
export class AuditQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AuditQueryDto): Promise<PaginatedResponseDto<AuditListItemDto>> {
    const where: Prisma.AuditoriaWhereInput = {
      ...(query.usuarioId ? { usuarioId: query.usuarioId } : {}),
      ...(query.entidade ? { entidade: query.entidade } : {}),
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
      this.prisma.auditoria.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { criadoEm: 'desc' },
        include: { usuario: { select: { nome: true } } },
      }),
      this.prisma.auditoria.count({ where }),
    ]);

    const data: AuditListItemDto[] = rows.map((a) => ({
      id: a.id,
      usuarioNome: a.usuario?.nome ?? null,
      acao: a.acao,
      entidade: a.entidade,
      entidadeId: a.entidadeId,
      ip: a.ip,
      criadoEm: a.criadoEm,
    }));
    return new PaginatedResponseDto(data, total, query.page, query.limit);
  }

  async detail(id: string): Promise<AuditDetailDto> {
    const a = await this.prisma.auditoria.findUnique({
      where: { id },
      include: { usuario: { select: { nome: true } } },
    });
    if (!a) throw new NotFoundError('Registro de auditoria', id);

    return {
      id: a.id,
      usuarioNome: a.usuario?.nome ?? null,
      acao: a.acao,
      entidade: a.entidade,
      entidadeId: a.entidadeId,
      ip: a.ip,
      criadoEm: a.criadoEm,
      dadosAntes: a.dadosAntes,
      dadosDepois: a.dadosDepois,
    };
  }
}
