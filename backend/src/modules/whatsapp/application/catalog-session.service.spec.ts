import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@core/database/prisma.service';
import { CatalogSessionService } from './catalog-session.service';

describe('CatalogSessionService', () => {
  let prisma: {
    sessaoCatalogo: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      deleteMany: jest.Mock;
    };
  };
  let service: CatalogSessionService;

  const daquiA = (horas: number) => new Date(Date.now() + horas * 60 * 60_000);

  beforeEach(() => {
    prisma = {
      sessaoCatalogo: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const config = { get: jest.fn(() => 'https://loja.exemplo/catalogo') };
    service = new CatalogSessionService(
      prisma as unknown as PrismaService,
      config as unknown as ConfigService,
    );
  });

  describe('criarLink', () => {
    it('reaproveita a sessão vigente em vez de criar uma linha por mensagem', async () => {
      prisma.sessaoCatalogo.findFirst.mockResolvedValue({
        id: 's1',
        codigo: 'AbCdEfGh',
        nome: 'Maria',
        expiraEm: daquiA(2),
      });

      const link = await service.criarLink('11999998888');

      expect(link).toBe('https://loja.exemplo/catalogo?s=AbCdEfGh');
      expect(prisma.sessaoCatalogo.create).not.toHaveBeenCalled();
    });

    it('emite um link novo quando não há sessão com fôlego suficiente', async () => {
      // `findFirst` filtra pela margem de reúso; nada vem = precisa criar.
      prisma.sessaoCatalogo.findFirst.mockResolvedValue(null);

      const link = await service.criarLink('11999998888', 'Maria');

      expect(prisma.sessaoCatalogo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ telefone: '11999998888', nome: 'Maria' }),
        }),
      );
      expect(link).toMatch(/^https:\/\/loja\.exemplo\/catalogo\?s=[A-Za-z2-9]{8}$/);
    });

    it('não reaproveita link à beira de vencer', async () => {
      await service.criarLink('11999998888');

      const { where } = prisma.sessaoCatalogo.findFirst.mock.calls[0][0];
      // O corte é no futuro, não em "agora": um link de 5 minutos não serve.
      expect(where.expiraEm.gt.getTime()).toBeGreaterThan(Date.now() + 60_000);
    });

    it('completa o nome na sessão reaproveitada quando ele só apareceu depois', async () => {
      prisma.sessaoCatalogo.findFirst.mockResolvedValue({
        id: 's1',
        codigo: 'AbCdEfGh',
        nome: null,
        expiraEm: daquiA(2),
      });

      await service.criarLink('11999998888', 'Maria');

      expect(prisma.sessaoCatalogo.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: { nome: 'Maria' },
      });
    });
  });

  describe('resolver', () => {
    it('recusa código vencido', async () => {
      prisma.sessaoCatalogo.findUnique.mockResolvedValue({
        telefone: '11999998888',
        expiraEm: daquiA(-1),
      });

      await expect(service.resolver('AbCdEfGh')).rejects.toThrow(UnauthorizedException);
    });

    it('recusa código inexistente', async () => {
      prisma.sessaoCatalogo.findUnique.mockResolvedValue(null);

      await expect(service.resolver('AbCdEfGh')).rejects.toThrow(UnauthorizedException);
    });
  });

  it('monta o link de acompanhamento na mesma origem pública do catálogo', () => {
    expect(service.linkAcompanhamento('tok-123')).toBe(
      'https://loja.exemplo/catalogo/pedido/tok-123',
    );
  });

  it('purga apenas sessões já vencidas', async () => {
    prisma.sessaoCatalogo.deleteMany.mockResolvedValue({ count: 4 });

    await expect(service.purgarExpiradas()).resolves.toBe(4);

    const { where } = prisma.sessaoCatalogo.deleteMany.mock.calls[0][0];
    expect(where.expiraEm.lt.getTime()).toBeLessThanOrEqual(Date.now());
  });
});
