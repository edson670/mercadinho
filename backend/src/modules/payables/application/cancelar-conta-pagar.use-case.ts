import { Injectable } from '@nestjs/common';
import { StatusContaPagar } from '@prisma/client';
import { PrismaService } from '@core/database/prisma.service';
import { BusinessRuleError, NotFoundError } from '@core/errors/domain.errors';

/**
 * Cancela uma conta — ou as futuras em aberto da mesma série mensal, quando
 * o contrato acaba no meio do ano e não faz sentido apagar uma a uma.
 *
 * Cancelar não apaga: a conta some do que se deve, mas continua no histórico
 * com os pagamentos que já tinham sido feitos.
 */
@Injectable()
export class CancelarContaPagarUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(contaId: string, cancelarFuturasDaSerie = false): Promise<{ canceladas: number }> {
    const conta = await this.prisma.contaPagar.findUnique({ where: { id: contaId } });
    if (!conta) throw new NotFoundError('Conta a pagar', contaId);
    if (conta.status === StatusContaPagar.CANCELADA) {
      throw new BusinessRuleError('Conta já está cancelada.');
    }
    if (conta.status === StatusContaPagar.PAGA) {
      throw new BusinessRuleError('Conta já paga não pode ser cancelada.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Transição condicional: a checagem acima roda fora da transação, então
      // dois cancelamentos simultâneos passariam os dois por ela.
      const { count } = await tx.contaPagar.updateMany({
        where: {
          id: contaId,
          status: { notIn: [StatusContaPagar.CANCELADA, StatusContaPagar.PAGA] },
        },
        data: { status: StatusContaPagar.CANCELADA },
      });
      if (count === 0) throw new BusinessRuleError('Conta já está cancelada ou paga.');

      let total = count;

      if (cancelarFuturasDaSerie && conta.grupoRecorrencia) {
        // Só as posteriores e ainda intocadas: parcela que já recebeu
        // pagamento fica, para o valor pago não sumir do histórico.
        const { count: futuras } = await tx.contaPagar.updateMany({
          where: {
            grupoRecorrencia: conta.grupoRecorrencia,
            vencimento: { gt: conta.vencimento },
            status: StatusContaPagar.ABERTA,
            valorPago: 0,
          },
          data: { status: StatusContaPagar.CANCELADA },
        });
        total += futuras;
      }

      return { canceladas: total };
    });
  }
}
