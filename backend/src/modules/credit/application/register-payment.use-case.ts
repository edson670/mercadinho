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

      const saldoAtual = Number(fiado.saldo);
      if (dto.valor > saldoAtual + 0.005) {
        throw new ValidationError(
          `Valor (${dto.valor}) maior que o saldo devedor (${saldoAtual}).`,
        );
      }

      const novoPago = Number((Number(fiado.valorPago) + dto.valor).toFixed(2));
      const novoSaldo = Number((Number(fiado.valorOriginal) - novoPago).toFixed(2));
      const status = novoSaldo <= 0.005 ? StatusFiado.QUITADO : StatusFiado.PARCIAL;

      await tx.pagamentoFiado.create({
        data: {
          fiadoId,
          usuarioId,
          valor: dto.valor,
          formaPagamento: dto.formaPagamento,
        },
      });

      await tx.fiado.update({
        where: { id: fiadoId },
        data: { valorPago: novoPago, saldo: Math.max(0, novoSaldo), status },
      });

      return { id: fiadoId };
    });
  }
}
