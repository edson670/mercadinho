import { Injectable } from '@nestjs/common';
import {
  Caixa,
  FormaPagamento,
  StatusCaixa,
  StatusVenda,
  TipoMovimentacaoCaixa,
} from '@prisma/client';
import { PrismaService } from '@core/database/prisma.service';
import { PaginatedResponseDto } from '@core/common/dto/paginated-response.dto';
import { BusinessRuleError, ForbiddenError, NotFoundError } from '@core/errors/domain.errors';
import {
  CashHistoryItemDto,
  CashHistoryQueryDto,
  CashRegisterResponseDto,
  CashTotalsDto,
  CloseCashDto,
} from '../presentation/dto/cash-register.dto';

@Injectable()
export class CashRegisterService {
  constructor(private readonly prisma: PrismaService) {}

  /** Abre um caixa para o operador (apenas um aberto por vez). */
  async open(usuarioId: string, valorAbertura: number): Promise<CashRegisterResponseDto> {
    const aberto = await this.prisma.caixa.findFirst({
      where: { usuarioId, status: StatusCaixa.ABERTO },
    });
    if (aberto) throw new BusinessRuleError('Você já possui um caixa aberto.');

    const caixa = await this.prisma.caixa.create({
      data: { usuarioId, valorAbertura, status: StatusCaixa.ABERTO },
    });
    return this.toResponse(caixa.id);
  }

  /** Caixa aberto do operador (ou null). */
  async getCurrent(usuarioId: string): Promise<CashRegisterResponseDto | null> {
    const caixa = await this.prisma.caixa.findFirst({
      where: { usuarioId, status: StatusCaixa.ABERTO },
    });
    return caixa ? this.toResponse(caixa.id) : null;
  }

  /** Registra sangria/suprimento no caixa aberto do operador. */
  async addMovement(
    caixaId: string,
    usuarioId: string,
    tipo: TipoMovimentacaoCaixa,
    valor: number,
    motivo: string,
  ): Promise<CashRegisterResponseDto> {
    const caixa = await this.ensureOwnedOpen(caixaId, usuarioId);
    await this.prisma.movimentacaoCaixa.create({
      data: { caixaId: caixa.id, usuarioId, tipo, valor, motivo },
    });
    return this.toResponse(caixa.id);
  }

  /** Fecha o caixa, consolidando os totais. */
  async close(
    caixaId: string,
    usuarioId: string,
    dto: CloseCashDto,
  ): Promise<CashRegisterResponseDto> {
    const caixa = await this.ensureOwnedOpen(caixaId, usuarioId);
    const totais = await this.computeTotals(caixa);

    await this.prisma.caixa.update({
      where: { id: caixa.id },
      data: {
        status: StatusCaixa.FECHADO,
        fechadoEm: new Date(),
        valorFechamento: dto.valorFechamento,
        observacoes: dto.observacoes,
        totalVendas: totais.totalVendas,
        totalSangrias: totais.totalSangrias,
        totalSuprimentos: totais.totalSuprimentos,
      },
    });
    return this.toResponse(caixa.id);
  }

  async history(query: CashHistoryQueryDto): Promise<PaginatedResponseDto<CashHistoryItemDto>> {
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.caixa.findMany({
        skip: query.skip,
        take: query.limit,
        orderBy: { abertoEm: 'desc' },
        include: { usuario: { select: { nome: true } } },
      }),
      this.prisma.caixa.count(),
    ]);

    const data: CashHistoryItemDto[] = rows.map((c) => ({
      id: c.id,
      status: c.status,
      usuarioNome: c.usuario?.nome ?? null,
      valorAbertura: Number(c.valorAbertura),
      valorFechamento: c.valorFechamento ? Number(c.valorFechamento) : null,
      totalVendas: c.totalVendas ? Number(c.totalVendas) : null,
      abertoEm: c.abertoEm,
      fechadoEm: c.fechadoEm,
    }));
    return new PaginatedResponseDto(data, total, query.page, query.limit);
  }

  // ── helpers ──────────────────────────────────────────────

  private async ensureOwnedOpen(caixaId: string, usuarioId: string): Promise<Caixa> {
    const caixa = await this.prisma.caixa.findUnique({ where: { id: caixaId } });
    if (!caixa) throw new NotFoundError('Caixa', caixaId);
    if (caixa.usuarioId !== usuarioId) throw new ForbiddenError('Este caixa não é seu.');
    if (caixa.status !== StatusCaixa.ABERTO) throw new BusinessRuleError('Caixa já está fechado.');
    return caixa;
  }

  private async computeTotals(caixa: Caixa): Promise<CashTotalsDto> {
    const [vendasTotal, vendasDinheiro, sangrias, suprimentos] = await Promise.all([
      this.prisma.vendaModel.aggregate({
        where: { caixaId: caixa.id, status: StatusVenda.CONCLUIDA },
        _sum: { total: true },
      }),
      this.prisma.vendaModel.aggregate({
        where: {
          caixaId: caixa.id,
          status: StatusVenda.CONCLUIDA,
          formaPagamento: FormaPagamento.DINHEIRO,
        },
        _sum: { total: true },
      }),
      this.prisma.movimentacaoCaixa.aggregate({
        where: { caixaId: caixa.id, tipo: TipoMovimentacaoCaixa.SANGRIA },
        _sum: { valor: true },
      }),
      this.prisma.movimentacaoCaixa.aggregate({
        where: { caixaId: caixa.id, tipo: TipoMovimentacaoCaixa.SUPRIMENTO },
        _sum: { valor: true },
      }),
    ]);

    const totalVendas = Number(vendasTotal._sum.total ?? 0);
    const dinheiro = Number(vendasDinheiro._sum.total ?? 0);
    const totalSangrias = Number(sangrias._sum.valor ?? 0);
    const totalSuprimentos = Number(suprimentos._sum.valor ?? 0);
    const saldoEsperado =
      Number(caixa.valorAbertura) + dinheiro + totalSuprimentos - totalSangrias;

    return {
      totalVendas,
      vendasDinheiro: dinheiro,
      totalSangrias,
      totalSuprimentos,
      saldoEsperado: Number(saldoEsperado.toFixed(2)),
    };
  }

  private async toResponse(caixaId: string): Promise<CashRegisterResponseDto> {
    const caixa = await this.prisma.caixa.findUniqueOrThrow({
      where: { id: caixaId },
      include: {
        usuario: { select: { nome: true } },
        movimentacoes: { orderBy: { criadoEm: 'desc' } },
      },
    });
    const totais = await this.computeTotals(caixa);
    const valorFechamento = caixa.valorFechamento ? Number(caixa.valorFechamento) : null;

    return {
      id: caixa.id,
      status: caixa.status,
      usuarioNome: caixa.usuario?.nome ?? null,
      valorAbertura: Number(caixa.valorAbertura),
      valorFechamento,
      abertoEm: caixa.abertoEm,
      fechadoEm: caixa.fechadoEm,
      totais,
      diferenca:
        valorFechamento !== null
          ? Number((valorFechamento - totais.saldoEsperado).toFixed(2))
          : null,
      movimentacoes: caixa.movimentacoes.map((m) => ({
        id: m.id,
        tipo: m.tipo,
        valor: Number(m.valor),
        motivo: m.motivo,
        criadoEm: m.criadoEm,
      })),
    };
  }
}
