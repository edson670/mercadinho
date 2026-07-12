import { OrigemMovimentacao, Prisma, TipoMovimentacaoEstoque } from '@prisma/client';
import { EstoqueInsuficienteError, NotFoundError } from '@core/errors/domain.errors';
import { PrismaService } from '@core/database/prisma.service';
import { StockService } from './stock.service';

function makeTx(produto: { id: string; nome: string; estoque: number } | null) {
  return {
    produto: {
      findUnique: jest.fn().mockResolvedValue(produto),
      update: jest.fn().mockResolvedValue(undefined),
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

      expect(tx.produto.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { estoque: 6 },
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

      expect(tx.produto.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { estoque: 10 } });
    });
  });
});
