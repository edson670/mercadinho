import { Injectable } from '@nestjs/common';
import { CategoriaDespesa, Prisma, StatusContaPagar } from '@prisma/client';
import { PrismaService } from '@core/database/prisma.service';
import { PaginatedResponseDto } from '@core/common/dto/paginated-response.dto';
import { NotFoundError } from '@core/errors/domain.errors';
import {
  PayableDetailDto,
  PayableListItemDto,
  PayableQueryDto,
  PayableSummaryDto,
} from '../presentation/dto/payable.dto';
import { diasAteVencer, hojeUtc, paraDataVencimento } from '../domain/vencimento.util';

/** Contas que ainda representam dívida — as duas encerradas ficam de fora. */
const EM_ABERTO = [StatusContaPagar.ABERTA, StatusContaPagar.PARCIAL];

type LinhaConta = {
  id: string;
  descricao: string;
  categoria: CategoriaDespesa;
  fornecedorId: string | null;
  fornecedor: { nome: string } | null;
  valorOriginal: Prisma.Decimal;
  valorPago: Prisma.Decimal;
  saldo: Prisma.Decimal;
  status: StatusContaPagar;
  vencimento: Date;
  observacoes: string | null;
  criadoEm: Date;
};

@Injectable()
export class PayablesQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: PayableQueryDto): Promise<PaginatedResponseDto<PayableListItemDto>> {
    const where = this.montarFiltro(query);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.contaPagar.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        // Vencimento primeiro: a pergunta do módulo é "o que vence agora",
        // não "o que foi cadastrado por último".
        orderBy: [{ vencimento: 'asc' }, { criadoEm: 'asc' }],
        include: { fornecedor: { select: { nome: true } } },
      }),
      this.prisma.contaPagar.count({ where }),
    ]);

    const hoje = hojeUtc();
    return new PaginatedResponseDto(
      rows.map((c) => this.paraItem(c, hoje)),
      total,
      query.page,
      query.limit,
    );
  }

  async detail(id: string): Promise<PayableDetailDto> {
    const conta = await this.prisma.contaPagar.findUnique({
      where: { id },
      include: {
        fornecedor: { select: { nome: true } },
        criadoPor: { select: { nome: true } },
        pagamentos: {
          orderBy: { data: 'desc' },
          include: { usuario: { select: { nome: true } } },
        },
      },
    });
    if (!conta) throw new NotFoundError('Conta a pagar', id);

    return {
      ...this.paraItem(conta, hojeUtc()),
      grupoRecorrencia: conta.grupoRecorrencia,
      criadoPorNome: conta.criadoPor?.nome ?? null,
      pagamentos: conta.pagamentos.map((p) => ({
        id: p.id,
        valor: Number(p.valor),
        formaPagamento: p.formaPagamento,
        observacoes: p.observacoes,
        usuarioNome: p.usuario?.nome ?? null,
        data: p.data,
      })),
    };
  }

  /** Os números do topo da tela: o que se deve, o que atrasou, o que vem aí. */
  async summary(): Promise<PayableSummaryDto> {
    const hoje = hojeUtc();
    const em7Dias = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000);
    const inicioDoMes = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1));

    const [abertas, pagamentosDoMes] = await Promise.all([
      this.prisma.contaPagar.findMany({
        where: { status: { in: EM_ABERTO } },
        select: { categoria: true, saldo: true, vencimento: true },
      }),
      this.prisma.pagamentoContaPagar.aggregate({
        where: { data: { gte: inicioDoMes } },
        _sum: { valor: true },
      }),
    ]);

    let totalEmAberto = 0;
    let totalVencido = 0;
    let quantidadeVencidas = 0;
    let totalAVencer7Dias = 0;
    let quantidadeAVencer7Dias = 0;
    const porCategoria = new Map<CategoriaDespesa, { total: number; quantidade: number }>();

    for (const c of abertas) {
      const saldo = Number(c.saldo);
      totalEmAberto += saldo;

      if (c.vencimento < hoje) {
        totalVencido += saldo;
        quantidadeVencidas += 1;
      } else if (c.vencimento <= em7Dias) {
        totalAVencer7Dias += saldo;
        quantidadeAVencer7Dias += 1;
      }

      const atual = porCategoria.get(c.categoria);
      if (atual) {
        atual.total += saldo;
        atual.quantidade += 1;
      } else {
        porCategoria.set(c.categoria, { total: saldo, quantidade: 1 });
      }
    }

    const arredonda = (v: number) => Number(v.toFixed(2));

    return {
      totalEmAberto: arredonda(totalEmAberto),
      totalVencido: arredonda(totalVencido),
      quantidadeVencidas,
      totalAVencer7Dias: arredonda(totalAVencer7Dias),
      quantidadeAVencer7Dias,
      pagoNoMes: arredonda(Number(pagamentosDoMes._sum.valor ?? 0)),
      porCategoria: [...porCategoria.entries()]
        .map(([categoria, v]) => ({
          categoria,
          total: arredonda(v.total),
          quantidade: v.quantidade,
        }))
        .sort((a, b) => b.total - a.total),
    };
  }

  private montarFiltro(query: PayableQueryDto): Prisma.ContaPagarWhereInput {
    const vencimento: Prisma.DateTimeFilter = {};
    if (query.vencimentoDe) vencimento.gte = paraDataVencimento(query.vencimentoDe);
    if (query.vencimentoAte) vencimento.lte = paraDataVencimento(query.vencimentoAte);

    return {
      ...(query.status ? { status: query.status } : {}),
      ...(query.categoria ? { categoria: query.categoria } : {}),
      ...(query.fornecedorId ? { fornecedorId: query.fornecedorId } : {}),
      ...(query.search
        ? { descricao: { contains: query.search, mode: Prisma.QueryMode.insensitive } }
        : {}),
      ...(Object.keys(vencimento).length ? { vencimento } : {}),
      // "Vencidas" é sempre sobre o que ainda se deve: conta paga com atraso
      // não é pendência, e mostrá-la aqui inflaria o problema.
      ...(query.vencidas
        ? { status: { in: EM_ABERTO }, vencimento: { ...vencimento, lt: hojeUtc() } }
        : {}),
    };
  }

  private paraItem(c: LinhaConta, hoje: Date): PayableListItemDto {
    const encerrada = c.status === StatusContaPagar.PAGA || c.status === StatusContaPagar.CANCELADA;
    const dias = diasAteVencer(c.vencimento, hoje);

    return {
      id: c.id,
      descricao: c.descricao,
      categoria: c.categoria,
      fornecedorId: c.fornecedorId,
      fornecedorNome: c.fornecedor?.nome ?? null,
      valorOriginal: Number(c.valorOriginal),
      valorPago: Number(c.valorPago),
      saldo: Number(c.saldo),
      status: c.status,
      vencimento: c.vencimento,
      // Conta encerrada não tem contagem regressiva: "vence em -12 dias" numa
      // conta já paga só confunde quem lê a lista.
      diasParaVencer: encerrada ? null : dias,
      vencida: !encerrada && dias < 0,
      observacoes: c.observacoes,
      criadoEm: c.criadoEm,
    };
  }
}
