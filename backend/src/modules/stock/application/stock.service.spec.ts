import { OrigemMovimentacao, Prisma, TipoMovimentacaoEstoque } from '@prisma/client';
import { EstoqueInsuficienteError, NotFoundError } from '@core/errors/domain.errors';
import { PrismaService } from '@core/database/prisma.service';
import { StockService } from './stock.service';

/**
 * Simula a linha do produto no banco. `updateMany` reproduz o comportamento do
 * UPDATE condicional: só afeta a linha quando todo o `where` casa — inclusive
 * o saldo mínimo. É esse `where` que garante que duas baixas concorrentes não
 * passem as duas, então os testes precisam exercitá-lo, não contorná-lo.
 */
function makeTx(produto: { id: string; nome: string; estoque: number } | null) {
  const linha = produto ? { ...produto } : null;

  return {
    produto: {
      updateMany: jest.fn().mockImplementation(({ where, data }) => {
        if (!linha || where.id !== linha.id) return Promise.resolve({ count: 0 });
        const minimo = where.estoque?.gte;
        if (minimo !== undefined && linha.estoque < minimo) {
          return Promise.resolve({ count: 0 });
        }
        linha.estoque += data.estoque.increment;
        return Promise.resolve({ count: 1 });
      }),
      findUnique: jest.fn().mockImplementation(() => Promise.resolve(linha)),
      findUniqueOrThrow: jest.fn().mockImplementation(() => {
        if (!linha) throw new Error('produto inexistente');
        return Promise.resolve(linha);
      }),
    },
    movimentacaoEstoque: {
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'mov-1', ...data })),
    },
  } as unknown as Prisma.TransactionClient;
}

describe('StockService', () => {
  let service: StockService;

  beforeEach(() => {
    service = new StockService({} as PrismaService);
  });

  describe('applyMovement', () => {
    it('lança NotFoundError quando o produto não existe', async () => {
      const tx = makeTx(null);

      await expect(
        service.applyMovement(tx, {
          produtoId: 'p1',
          delta: 10,
          tipo: TipoMovimentacaoEstoque.ENTRADA,
          origem: OrigemMovimentacao.AJUSTE_MANUAL,
          usuarioId: 'u1',
        }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('lança EstoqueInsuficienteError quando o resultado ficaria negativo', async () => {
      const tx = makeTx({ id: 'p1', nome: 'Arroz 5kg', estoque: 3 });

      await expect(
        service.applyMovement(tx, {
          produtoId: 'p1',
          delta: -5,
          tipo: TipoMovimentacaoEstoque.SAIDA,
          origem: OrigemMovimentacao.VENDA,
          usuarioId: 'u1',
        }),
      ).rejects.toBeInstanceOf(EstoqueInsuficienteError);
    });

    it('atualiza o estoque e registra a movimentação quando o saldo é suficiente', async () => {
      const tx = makeTx({ id: 'p1', nome: 'Arroz 5kg', estoque: 10 });

      const result = await service.applyMovement(tx, {
        produtoId: 'p1',
        delta: -4,
        tipo: TipoMovimentacaoEstoque.SAIDA,
        origem: OrigemMovimentacao.VENDA,
        usuarioId: 'u1',
        motivo: 'Venda #1',
      });

      expect(tx.produto.updateMany).toHaveBeenCalledWith({
        where: { id: 'p1', estoque: { gte: 4 } },
        data: { estoque: { increment: -4 } },
      });
      expect(tx.movimentacaoEstoque.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            produtoId: 'p1',
            quantidade: 4,
            estoqueAnterior: 10,
            estoqueResultante: 6,
          }),
        }),
      );
      expect(result).toMatchObject({ estoqueResultante: 6 });
    });

    it('permite o estoque chegar exatamente a zero', async () => {
      const tx = makeTx({ id: 'p1', nome: 'Feijão 1kg', estoque: 5 });

      await expect(
        service.applyMovement(tx, {
          produtoId: 'p1',
          delta: -5,
          tipo: TipoMovimentacaoEstoque.SAIDA,
          origem: OrigemMovimentacao.VENDA,
          usuarioId: 'u1',
        }),
      ).resolves.toMatchObject({ estoqueResultante: 0 });
    });
  });

  describe('registerEntry', () => {
    it('delega para applyMovement dentro de uma transação com delta positivo', async () => {
      const tx = makeTx({ id: 'p1', nome: 'Óleo', estoque: 2 });
      const prisma = { $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(tx)) } as unknown as PrismaService;
      service = new StockService(prisma);

      await service.registerEntry('p1', 8, 'u1', 'Reposição');

      // Entrada não leva condição de saldo: só baixa pode faltar estoque.
      expect(tx.produto.updateMany).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { estoque: { increment: 8 } },
      });
    });
  });

  describe('concorrência', () => {
    // O bug que esta suíte trava: o saldo era lido, calculado em memória e
    // gravado de volta. Duas baixas simultâneas liam o mesmo valor e a segunda
    // sobrescrevia a primeira — vendia dois, baixava um. A checagem precisa
    // viajar dentro do UPDATE para o banco poder reavaliá-la sob lock.
    it('leva a checagem de saldo dentro do where do update, não em leitura prévia', async () => {
      const tx = makeTx({ id: 'p1', nome: 'Arroz 5kg', estoque: 10 });

      await service.applyMovement(tx, {
        produtoId: 'p1',
        delta: -4,
        tipo: TipoMovimentacaoEstoque.SAIDA,
        origem: OrigemMovimentacao.VENDA,
        usuarioId: 'u1',
      });

      const { where } = (tx.produto.updateMany as jest.Mock).mock.calls[0][0];
      expect(where.estoque).toEqual({ gte: 4 });
    });

    it('a segunda de duas baixas concorrentes falha em vez de sobrescrever a primeira', async () => {
      // Mesma linha compartilhada pelas duas operações, como no banco.
      const tx = makeTx({ id: 'p1', nome: 'Arroz 5kg', estoque: 5 });
      const baixa = () =>
        service.applyMovement(tx, {
          produtoId: 'p1',
          delta: -3,
          tipo: TipoMovimentacaoEstoque.SAIDA,
          origem: OrigemMovimentacao.VENDA,
          usuarioId: 'u1',
        });

      await expect(baixa()).resolves.toMatchObject({ estoqueResultante: 2 });
      // 2 em estoque não cobre outra baixa de 3: recusa, não fica negativo.
      await expect(baixa()).rejects.toBeInstanceOf(EstoqueInsuficienteError);
    });
  });
});
