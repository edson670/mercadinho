import { Injectable } from '@nestjs/common';
import { Prisma, StatusContaPagar } from '@prisma/client';
import { PrismaService } from '@core/database/prisma.service';
import { BusinessRuleError, NotFoundError, ValidationError } from '@core/errors/domain.errors';
import { UpdatePayableDto } from '../presentation/dto/payable.dto';
import { paraDataVencimento } from '../domain/vencimento.util';

/**
 * Edita uma conta ainda em aberto. Mudar o valor recalcula o saldo a partir
 * do que já foi pago — e não aceita valor abaixo disso, que produziria saldo
 * negativo (a loja teria "pago a mais" uma conta que nunca existiu).
 */
@Injectable()
export class AtualizarContaPagarUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(contaId: string, dto: UpdatePayableDto): Promise<{ id: string }> {
    return this.prisma.$transaction(async (tx) => {
      const conta = await tx.contaPagar.findUnique({ where: { id: contaId } });
      if (!conta) throw new NotFoundError('Conta a pagar', contaId);
      if (conta.status === StatusContaPagar.PAGA) {
        throw new BusinessRuleError('Conta paga não pode ser editada.');
      }
      if (conta.status === StatusContaPagar.CANCELADA) {
        throw new BusinessRuleError('Conta cancelada não pode ser editada.');
      }

      const data: Prisma.ContaPagarUpdateInput = {};

      if (dto.descricao !== undefined) data.descricao = dto.descricao;
      if (dto.categoria !== undefined) data.categoria = dto.categoria;
      if (dto.observacoes !== undefined) data.observacoes = dto.observacoes || null;

      if (dto.fornecedorId !== undefined) {
        if (dto.fornecedorId === null) {
          data.fornecedor = { disconnect: true };
        } else {
          const existe = await tx.fornecedor.findUnique({
            where: { id: dto.fornecedorId },
            select: { id: true },
          });
          if (!existe) throw new NotFoundError('Fornecedor', dto.fornecedorId);
          data.fornecedor = { connect: { id: dto.fornecedorId } };
        }
      }

      if (dto.vencimento !== undefined) {
        const vencimento = paraDataVencimento(dto.vencimento);
        if (Number.isNaN(vencimento.getTime())) {
          throw new ValidationError('Data de vencimento inválida.');
        }
        data.vencimento = vencimento;
      }

      if (dto.valor !== undefined) {
        const jaPago = Number(conta.valorPago);
        if (dto.valor < jaPago - 0.005) {
          throw new ValidationError(
            `Valor (${dto.valor}) menor que o já pago (${jaPago}). Estorne o pagamento antes de reduzir a conta.`,
          );
        }
        const novoSaldo = Number((dto.valor - jaPago).toFixed(2));
        data.valorOriginal = dto.valor;
        data.saldo = Math.max(0, novoSaldo);
        // Quitar por edição é legítimo: o valor caiu até o que já foi pago.
        data.status = novoSaldo <= 0.005 ? StatusContaPagar.PAGA : conta.status;
      }

      await tx.contaPagar.update({ where: { id: contaId }, data });
      return { id: contaId };
    });
  }
}
