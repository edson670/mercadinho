import { StatusContaPagar, FormaPagamento } from '@prisma/client';
import { PrismaService } from '@core/database/prisma.service';
import { BusinessRuleError, NotFoundError, ValidationError } from '@core/errors/domain.errors';
import { RegistrarPagamentoContaUseCase } from './registrar-pagamento-conta.use-case';

/**
 * O `tx` simula a semântica de UPDATE condicional do Postgres: `updateMany`
 * só aplica (e só conta) quando a linha atende ao `where`. Um mock que
 * ignorasse a condição deixaria passar justamente o bug que ela evita.
 */
function makeTx(conta: { id: string; valorPago: number; saldo: number; status: StatusContaPagar }) {
  const pagamentos: { valor: number }[] = [];

  const tx = {
    contaPagar: {
      findUnique: jest.fn(async ({ where }: { where: { id: string } }) =>
        where.id === conta.id ? { ...conta } : null,
      ),
      findUniqueOrThrow: jest.fn(async () => ({ ...conta })),
      updateMany: jest.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string; status?: { notIn: StatusContaPagar[] }; saldo?: { gte: number } };
          data: { valorPago: { increment: number }; saldo: { decrement: number } };
        }) => {
          if (where.id !== conta.id) return { count: 0 };
          if (where.status?.notIn.includes(conta.status)) return { count: 0 };
          if (where.saldo && conta.saldo < where.saldo.gte) return { count: 0 };

          conta.valorPago = Number((conta.valorPago + data.valorPago.increment).toFixed(2));
          conta.saldo = Number((conta.saldo - data.saldo.decrement).toFixed(2));
          return { count: 1 };
        },
      ),
      update: jest.fn(async ({ data }: { data: { saldo: number; status: StatusContaPagar } }) => {
        conta.saldo = data.saldo;
        conta.status = data.status;
        return { ...conta };
      }),
    },
    pagamentoContaPagar: {
      create: jest.fn(async ({ data }: { data: { valor: number } }) => {
        pagamentos.push({ valor: data.valor });
        return data;
      }),
    },
  };

  return { tx, conta, pagamentos };
}

function makeUseCase(ctx: ReturnType<typeof makeTx>) {
  const prisma = {
    $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(ctx.tx)),
  };
  return new RegistrarPagamentoContaUseCase(prisma as unknown as PrismaService);
}

const pagamento = (valor: number) => ({ valor, formaPagamento: FormaPagamento.PIX });

describe('RegistrarPagamentoContaUseCase', () => {
  it('abate parcialmente e marca PARCIAL', async () => {
    const ctx = makeTx({ id: 'c1', valorPago: 0, saldo: 1000, status: StatusContaPagar.ABERTA });

    const r = await makeUseCase(ctx).execute('c1', pagamento(300), 'u1');

    expect(r.saldo).toBe(700);
    expect(r.status).toBe(StatusContaPagar.PARCIAL);
    expect(ctx.conta.valorPago).toBe(300);
  });

  it('quita e marca PAGA quando o saldo zera', async () => {
    const ctx = makeTx({ id: 'c1', valorPago: 700, saldo: 300, status: StatusContaPagar.PARCIAL });

    const r = await makeUseCase(ctx).execute('c1', pagamento(300), 'u1');

    expect(r.saldo).toBe(0);
    expect(r.status).toBe(StatusContaPagar.PAGA);
  });

  it('recusa valor acima do saldo devedor', async () => {
    const ctx = makeTx({ id: 'c1', valorPago: 0, saldo: 100, status: StatusContaPagar.ABERTA });

    await expect(makeUseCase(ctx).execute('c1', pagamento(150), 'u1')).rejects.toThrow(
      ValidationError,
    );
    expect(ctx.conta.saldo).toBe(100);
    expect(ctx.pagamentos).toHaveLength(0);
  });

  it('recusa pagar conta já paga', async () => {
    const ctx = makeTx({ id: 'c1', valorPago: 100, saldo: 0, status: StatusContaPagar.PAGA });

    await expect(makeUseCase(ctx).execute('c1', pagamento(10), 'u1')).rejects.toThrow(
      BusinessRuleError,
    );
  });

  it('recusa pagar conta cancelada', async () => {
    const ctx = makeTx({ id: 'c1', valorPago: 0, saldo: 100, status: StatusContaPagar.CANCELADA });

    await expect(makeUseCase(ctx).execute('c1', pagamento(10), 'u1')).rejects.toThrow(
      BusinessRuleError,
    );
  });

  it('404 quando a conta não existe', async () => {
    const ctx = makeTx({ id: 'c1', valorPago: 0, saldo: 100, status: StatusContaPagar.ABERTA });

    await expect(makeUseCase(ctx).execute('inexistente', pagamento(10), 'u1')).rejects.toThrow(
      NotFoundError,
    );
  });

  it('dois pagamentos do saldo total: o segundo é recusado, não abatido duas vezes', async () => {
    const ctx = makeTx({ id: 'c1', valorPago: 0, saldo: 500, status: StatusContaPagar.ABERTA });
    const useCase = makeUseCase(ctx);

    await useCase.execute('c1', pagamento(500), 'u1');
    await expect(useCase.execute('c1', pagamento(500), 'u2')).rejects.toThrow(BusinessRuleError);

    expect(ctx.conta.valorPago).toBe(500);
    expect(ctx.pagamentos).toHaveLength(1);
  });

  it('tolera só a sujeira de arredondamento, não um centavo a mais', async () => {
    // A folga é de meio centavo: absorve o resíduo de float, mas pagar
    // R$ 100,00 numa conta de R$ 99,99 continua sendo pagar a mais.
    const quase = makeTx({
      id: 'c1',
      valorPago: 0,
      saldo: 99.999,
      status: StatusContaPagar.ABERTA,
    });
    await expect(makeUseCase(quase).execute('c1', pagamento(100), 'u1')).resolves.toMatchObject({
      status: StatusContaPagar.PAGA,
    });

    const umCentavoAMais = makeTx({
      id: 'c1',
      valorPago: 0,
      saldo: 99.99,
      status: StatusContaPagar.ABERTA,
    });
    await expect(makeUseCase(umCentavoAMais).execute('c1', pagamento(100), 'u1')).rejects.toThrow(
      ValidationError,
    );
  });
});
