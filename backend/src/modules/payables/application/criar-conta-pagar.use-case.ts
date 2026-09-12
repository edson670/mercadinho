import { Injectable } from '@nestjs/common';
import { CategoriaDespesa, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '@core/database/prisma.service';
import { NotFoundError, ValidationError } from '@core/errors/domain.errors';
import { CreatePayableDto } from '../presentation/dto/payable.dto';
import { paraDataVencimento, somarMeses } from '../domain/vencimento.util';

/**
 * Cria uma conta a pagar — ou a série mensal inteira, quando `repetirMeses`
 * vem preenchido. Gerar as parcelas de uma vez (em vez de um cron que cria a
 * próxima) deixa o compromisso do ano todo visível no fluxo de caixa desde o
 * primeiro dia, que é justamente o que se quer enxergar em aluguel e energia.
 */
@Injectable()
export class CriarContaPagarUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(dto: CreatePayableDto, usuarioId: string): Promise<{ ids: string[] }> {
    if (dto.fornecedorId) {
      const fornecedor = await this.prisma.fornecedor.findUnique({
        where: { id: dto.fornecedorId },
        select: { id: true, ativo: true },
      });
      if (!fornecedor) throw new NotFoundError('Fornecedor', dto.fornecedorId);
      if (!fornecedor.ativo) {
        throw new ValidationError('Fornecedor inativo não pode receber novas contas.');
      }
    }

    const primeiroVencimento = paraDataVencimento(dto.vencimento);
    if (Number.isNaN(primeiroVencimento.getTime())) {
      throw new ValidationError('Data de vencimento inválida.');
    }

    const repeticoes = dto.repetirMeses ?? 1;
    // Só marca o grupo quando há série: uma conta avulsa não pertence a nada.
    const grupoRecorrencia = repeticoes > 1 ? randomUUID() : null;

    const linhas: Prisma.ContaPagarCreateManyInput[] = Array.from(
      { length: repeticoes },
      (_, i) => ({
        descricao: dto.descricao,
        categoria: dto.categoria ?? CategoriaDespesa.OUTROS,
        fornecedorId: dto.fornecedorId ?? null,
        valorOriginal: dto.valor,
        valorPago: 0,
        saldo: dto.valor,
        vencimento: somarMeses(primeiroVencimento, i),
        observacoes: dto.observacoes ?? null,
        grupoRecorrencia,
        criadoPorId: usuarioId,
      }),
    );

    const criadas = await this.prisma.$transaction(
      linhas.map((data) => this.prisma.contaPagar.create({ data, select: { id: true } })),
    );

    return { ids: criadas.map((c) => c.id) };
  }
}
