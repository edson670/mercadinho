import { FormaPagamento, StatusFiado } from '@prisma/client';
import { BusinessRuleError, NotFoundError, ValidationError } from '@core/errors/domain.errors';
import { PrismaService } from '@core/database/prisma.service';
import { RegisterPaymentUseCase } from './register-payment.use-case';

interface FakeTx {
  fiado: { findUnique: jest.Mock; update: jest.Mock };
  pagamentoFiado: { create: jest.Mock };
}

function makePrisma(fiado: Record<string, unknown> | null) {
  const tx: FakeTx = {
    fiado: {
      findUnique: jest.fn().mockResolvedValue(fiado),
      update: jest.fn().mockResolvedValue(undefined),
    },
    pagamentoFiado: {
      create: jest.fn().mockResolvedValue(undefined),
    },
  };
  const prisma = {
    $transaction: jest.fn((cb: (tx: FakeTx) => unknown) => cb(tx)),
  } as unknown as PrismaService;
  return { prisma, tx };
}

describe('RegisterPaymentUseCase', () => {
  it('rejeita pagamento na forma FIADO', async () => {
    const { prisma } = makePrisma({});
    const useCase = new RegisterPaymentUseCase(prisma);

    await expect(
      useCase.execute('f1', { valor: 10, formaPagamento: FormaPagamento.FIADO }, 'u1'),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('lança NotFoundError quando o fiado não existe', async () => {
    const { prisma } = makePrisma(null);
    const useCase = new RegisterPaymentUseCase(prisma);

    await expect(
      useCase.execute('f1', { valor: 10, formaPagamento: FormaPagamento.DINHEIRO }, 'u1'),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('lança BusinessRuleError quando o fiado já está quitado', async () => {
    const { prisma } = makePrisma({
      id: 'f1',
      status: StatusFiado.QUITADO,
      saldo: 0,
      valorPago: 100,
      valorOriginal: 100,
    });
    const useCase = new RegisterPaymentUseCase(prisma);

    await expect(
      useCase.execute('f1', { valor: 10, formaPagamento: FormaPagamento.DINHEIRO }, 'u1'),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('rejeita valor maior que o saldo devedor', async () => {
    const { prisma } = makePrisma({
      id: 'f1',
      status: StatusFiado.ABERTO,
      saldo: 50,
      valorPago: 0,
      valorOriginal: 50,
    });
    const useCase = new RegisterPaymentUseCase(prisma);

    await expect(
      useCase.execute('f1', { valor: 100, formaPagamento: FormaPagamento.DINHEIRO }, 'u1'),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('marca como PARCIAL quando o pagamento não quita o saldo', async () => {
    const { prisma, tx } = makePrisma({
      id: 'f1',
      status: StatusFiado.ABERTO,
      saldo: 100,
      valorPago: 0,
      valorOriginal: 100,
    });
    const useCase = new RegisterPaymentUseCase(prisma);

    await useCase.execute('f1', { valor: 40, formaPagamento: FormaPagamento.DINHEIRO }, 'u1');

    expect(tx.fiado.update).toHaveBeenCalledWith({
      where: { id: 'f1' },
      data: { valorPago: 40, saldo: 60, status: StatusFiado.PARCIAL },
    });
  });

  it('marca como QUITADO quando o pagamento cobre o saldo total', async () => {
    const { prisma, tx } = makePrisma({
      id: 'f1',
      status: StatusFiado.PARCIAL,
      saldo: 30,
      valorPago: 70,
      valorOriginal: 100,
    });
    const useCase = new RegisterPaymentUseCase(prisma);

    await useCase.execute('f1', { valor: 30, formaPagamento: FormaPagamento.PIX }, 'u1');

    expect(tx.fiado.update).toHaveBeenCalledWith({
      where: { id: 'f1' },
      data: { valorPago: 100, saldo: 0, status: StatusFiado.QUITADO },
    });
  });
});
