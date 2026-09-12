import { FormaPagamento, StatusFiado } from '@prisma/client';
import { BusinessRuleError, NotFoundError, ValidationError } from '@core/errors/domain.errors';
import { PrismaService } from '@core/database/prisma.service';
import { RegisterPaymentUseCase } from './register-payment.use-case';

interface FakeTx {
  fiado: {
    findUnique: jest.Mock;
    findUniqueOrThrow: jest.Mock;
    updateMany: jest.Mock;
    update: jest.Mock;
  };
  pagamentoFiado: { create: jest.Mock };
}

/**
 * `updateMany` reproduz o UPDATE condicional: só abate quando o `where`
 * casa (saldo suficiente e fiado não quitado) e aplica increment/decrement
 * sobre o valor corrente da linha, como o banco faria.
 */
function makePrisma(fiado: Record<string, unknown> | null) {
  const linha = fiado ? { ...fiado } : null;

  const tx: FakeTx = {
    fiado: {
      findUnique: jest.fn().mockImplementation(() => Promise.resolve(linha)),
      findUniqueOrThrow: jest.fn().mockImplementation(() => Promise.resolve(linha)),
      updateMany: jest.fn().mockImplementation(({ where, data }) => {
        if (!linha || where.id !== linha.id) return Promise.resolve({ count: 0 });
        if (where.status?.not && linha.status === where.status.not) {
          return Promise.resolve({ count: 0 });
        }
        const minimo = where.saldo?.gte;
        if (minimo !== undefined && (linha.saldo as number) < minimo) {
          return Promise.resolve({ count: 0 });
        }
        linha.valorPago = (linha.valorPago as number) + data.valorPago.increment;
        linha.saldo = (linha.saldo as number) - data.saldo.decrement;
        return Promise.resolve({ count: 1 });
      }),
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

    // O abatimento é incremental (o banco soma sobre o valor corrente), não
    // um valor calculado a partir da leitura.
    expect(tx.fiado.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'f1',
        status: { not: StatusFiado.QUITADO },
        saldo: { gte: 40 - 0.005 },
      },
      data: { valorPago: { increment: 40 }, saldo: { decrement: 40 } },
    });
    expect(tx.fiado.update).toHaveBeenCalledWith({
      where: { id: 'f1' },
      data: { saldo: 60, status: StatusFiado.PARCIAL },
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
      data: { saldo: 0, status: StatusFiado.QUITADO },
    });
  });

  // O bug que este teste trava: valorPago era recalculado a partir do valor
  // lido no início da transação. Dois pagamentos simultâneos gravavam duas
  // linhas em PagamentoFiado mas só um abatimento — o cliente pagava duas
  // vezes e continuava devendo uma.
  it('dois pagamentos seguidos sobre o mesmo fiado abatem os dois', async () => {
    const { prisma, tx } = makePrisma({
      id: 'f1',
      status: StatusFiado.ABERTO,
      saldo: 100,
      valorPago: 0,
      valorOriginal: 100,
    });
    const useCase = new RegisterPaymentUseCase(prisma);
    const pagar = (valor: number) =>
      useCase.execute('f1', { valor, formaPagamento: FormaPagamento.DINHEIRO }, 'u1');

    await pagar(40);
    await pagar(40);

    expect(tx.pagamentoFiado.create).toHaveBeenCalledTimes(2);
    // 100 - 40 - 40: o segundo abatimento não sobrescreveu o primeiro.
    expect(tx.fiado.update).toHaveBeenLastCalledWith({
      where: { id: 'f1' },
      data: { saldo: 20, status: StatusFiado.PARCIAL },
    });
  });

  it('recusa o segundo pagamento quando o saldo restante não cobre', async () => {
    const { prisma } = makePrisma({
      id: 'f1',
      status: StatusFiado.ABERTO,
      saldo: 50,
      valorPago: 0,
      valorOriginal: 50,
    });
    const useCase = new RegisterPaymentUseCase(prisma);
    const pagar = (valor: number) =>
      useCase.execute('f1', { valor, formaPagamento: FormaPagamento.DINHEIRO }, 'u1');

    await pagar(30);
    await expect(pagar(30)).rejects.toBeInstanceOf(ValidationError);
  });
});
