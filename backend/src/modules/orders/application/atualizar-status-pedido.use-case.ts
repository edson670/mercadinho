import { Inject, Injectable, Logger } from '@nestjs/common';
import { StatusPedido } from '@prisma/client';
import { PrismaService } from '@core/database/prisma.service';
import { BusinessRuleError, NotFoundError, ValidationError } from '@core/errors/domain.errors';
import { IOrderNotifier, ORDER_NOTIFIER } from './order-notifier';

/** Transições permitidas do ciclo de vida (cancelamento tem use case próprio). */
const TRANSICOES: Record<StatusPedido, StatusPedido[]> = {
  RECEBIDO: [StatusPedido.EM_SEPARACAO],
  EM_SEPARACAO: [StatusPedido.SAIU_PARA_ENTREGA],
  SAIU_PARA_ENTREGA: [StatusPedido.ENTREGUE],
  ENTREGUE: [],
  CANCELADO: [],
};

@Injectable()
export class AtualizarStatusPedidoUseCase {
  private readonly logger = new Logger(AtualizarStatusPedidoUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ORDER_NOTIFIER) private readonly notifier: IOrderNotifier,
  ) {}

  async execute(pedidoId: string, novoStatus: StatusPedido, usuarioId: string) {
    if (novoStatus === StatusPedido.CANCELADO) {
      throw new ValidationError('Use o endpoint de cancelamento (estorna o estoque).');
    }

    const pedido = await this.prisma.pedido.findUnique({ where: { id: pedidoId } });
    if (!pedido) throw new NotFoundError('Pedido', pedidoId);

    if (!TRANSICOES[pedido.status].includes(novoStatus)) {
      throw new BusinessRuleError(
        `Transição inválida: ${pedido.status} → ${novoStatus}.`,
      );
    }

    const [atualizado] = await this.prisma.$transaction([
      this.prisma.pedido.update({ where: { id: pedidoId }, data: { status: novoStatus } }),
      this.prisma.historicoStatusPedido.create({
        data: { pedidoId, status: novoStatus, usuarioId },
      }),
    ]);

    this.notifier.orderStatusChanged(atualizado, novoStatus).catch((err) => {
      this.logger.error(`Falha ao notificar status do pedido #${atualizado.numero}`, err);
    });

    return atualizado;
  }
}
