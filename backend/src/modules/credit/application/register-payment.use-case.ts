import { Injectable } from '@nestjs/common';
import { FormaPagamento, StatusFiado } from '@prisma/client';
import { PrismaService } from '@core/database/prisma.service';
import { BusinessRuleError, NotFoundError, ValidationError } from '@core/errors/domain.errors';
import { RegisterPaymentDto } from '../presentation/dto/credit.dto';

/**
 * Registra o pagamento (total ou parcial) de um fiado.
 * Atualiza valorPago/saldo e o status (ABERTO → PARCIAL → QUITADO)
 * na mesma transação. Não permite pagar mais que o saldo devedor.
 */
@Injectable()
export class RegisterPaymentUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(fiadoId: string, dto: RegisterPaymentDto, usuarioId: string): Promise<{ id: string }> {
    if (dto.formaPagamento === FormaPagamento.FIADO) {
      throw new ValidationError('Pagamento de fiado não pode ser na forma FIADO.');
    }

    return this.prisma.$transaction(async (tx) => {
      const fiado = await tx.fiado.findUnique({ where: { id: fiadoId } });
      if (!fiado) throw new NotFoundError('Fiado', fiadoId);
      if (fiado.status === StatusFiado.QUITADO) {
        throw new BusinessRuleError('Este fiado já está quitado.');
      }

      // Abatimento atômico: o novo valorPago não é calculado a partir do que
      // foi lido acima — é um incremento que o banco aplica sobre o valor
      // corrente, e a checagem de saldo viaja no `where`. Com o cálculo em
      // memória, dois pagamentos simultâneos gravavam duas linhas em
      // PagamentoFiado mas só um abatimento no fiado: o cliente pagava duas
      // vezes e continuava devendo uma. A tolerância de meio centavo é a
      // mesma de antes, para arredondamento.
      const { count } = await tx.fiado.updateMany({
        where: {
          id: fiadoId,
          status: { not: StatusFiado.QUITADO },
          saldo: { gte: dto.valor - 0.005 },
        },
        data: {
          valorPago: { increment: dto.valor },
          saldo: { decrement: dto.valor },
        },
      });
      if (count === 0) {
        throw new ValidationError(
          `Valor (${dto.valor}) maior que o saldo devedor (${Number(fiado.saldo)}).`,
        );
      }

      await tx.pagamentoFiado.create({
        data: {
          fiadoId,
          usuarioId,
          valor: dto.valor,
          formaPagamento: dto.formaPagamento,
        },
      });

      // Status derivado do saldo que o banco realmente gravou.
      const atualizado = await tx.fiado.findUniqueOrThrow({ where: { id: fiadoId } });
      const saldoFinal = Number(atualizado.saldo);
      await tx.fiado.update({
        where: { id: fiadoId },
        data: {
          saldo: Math.max(0, saldoFinal),
          status: saldoFinal <= 0.005 ? StatusFiado.QUITADO : StatusFiado.PARCIAL,
        },
      });

      return { id: fiadoId };
    });
  }
}
