import { Injectable } from '@nestjs/common';
import { StatusContaPagar } from '@prisma/client';
import { PrismaService } from '@core/database/prisma.service';
import { BusinessRuleError, NotFoundError, ValidationError } from '@core/errors/domain.errors';
import { RegisterPayablePaymentDto } from '../presentation/dto/payable.dto';

/**
 * Registra o pagamento (total ou parcial) de uma conta a pagar.
 *
 * O abatimento é um UPDATE condicional, não um cálculo em memória: a checagem
 * de saldo viaja no `where` e o banco reavalia a condição depois de esperar o
 * lock da linha. Com o cálculo em memória, dois pagamentos simultâneos gravam
 * dois recibos e um único abatimento — a loja pagaria duas vezes e a conta
 * continuaria devendo uma. Mesma mecânica do fiado, e a mesma tolerância de
 * meio centavo para arredondamento.
 *
 * O pagamento NÃO movimenta o caixa: contas a pagar saem majoritariamente do
 * banco, e exigir um caixa aberto para quitar o aluguel travaria o módulo.
 */
@Injectable()
export class RegistrarPagamentoContaUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    contaId: string,
    dto: RegisterPayablePaymentDto,
    usuarioId: string,
  ): Promise<{ id: string; saldo: number; status: StatusContaPagar }> {
    return this.prisma.$transaction(async (tx) => {
      const conta = await tx.contaPagar.findUnique({ where: { id: contaId } });
      if (!conta) throw new NotFoundError('Conta a pagar', contaId);
      if (conta.status === StatusContaPagar.PAGA) {
        throw new BusinessRuleError('Esta conta já está paga.');
      }
      if (conta.status === StatusContaPagar.CANCELADA) {
        throw new BusinessRuleError('Conta cancelada não aceita pagamento.');
      }

      const { count } = await tx.contaPagar.updateMany({
        where: {
          id: contaId,
          status: { notIn: [StatusContaPagar.PAGA, StatusContaPagar.CANCELADA] },
          saldo: { gte: dto.valor - 0.005 },
        },
        data: {
          valorPago: { increment: dto.valor },
          saldo: { decrement: dto.valor },
        },
      });
      if (count === 0) {
        throw new ValidationError(
          `Valor (${dto.valor}) maior que o saldo devedor (${Number(conta.saldo)}).`,
        );
      }

      await tx.pagamentoContaPagar.create({
        data: {
          contaId,
          usuarioId,
          valor: dto.valor,
          formaPagamento: dto.formaPagamento,
          observacoes: dto.observacoes ?? null,
        },
      });

      // Status derivado do saldo que o banco realmente gravou, nunca do lido
      // no início: entre a leitura e aqui outro pagamento pode ter entrado.
      const atualizada = await tx.contaPagar.findUniqueOrThrow({ where: { id: contaId } });
      const saldoFinal = Number(atualizada.saldo);
      const status = saldoFinal <= 0.005 ? StatusContaPagar.PAGA : StatusContaPagar.PARCIAL;

      await tx.contaPagar.update({
        where: { id: contaId },
        data: { saldo: Math.max(0, saldoFinal), status },
      });

      return { id: contaId, saldo: Math.max(0, saldoFinal), status };
    });
  }
}
