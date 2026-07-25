import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LgpdService } from './lgpd.service';
import { PrismaService } from '@core/database/prisma.service';

describe('LgpdService', () => {
  let prisma: {
    cliente: { findUnique: jest.Mock; update: jest.Mock };
    mensagemWhatsApp: { findMany: jest.Mock; deleteMany: jest.Mock };
    pedido: { updateMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let config: { get: jest.Mock };
  let service: LgpdService;

  beforeEach(() => {
    prisma = {
      cliente: { findUnique: jest.fn(), update: jest.fn() },
      mensagemWhatsApp: { findMany: jest.fn(), deleteMany: jest.fn() },
      pedido: { updateMany: jest.fn() },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma)),
    };
    config = { get: jest.fn((_key: string, def?: unknown) => def) };

    service = new LgpdService(prisma as unknown as PrismaService, config as unknown as ConfigService);
  });

  describe('exportarCliente', () => {
    it('lança 404 quando o cliente não existe', async () => {
      prisma.cliente.findUnique.mockResolvedValue(null);

      await expect(service.exportarCliente('inexistente')).rejects.toThrow(NotFoundException);
    });

    it('reúne dados cadastrais, pedidos, vendas e mensagens pelo telefone', async () => {
      prisma.cliente.findUnique.mockResolvedValue({
        nome: 'Maria',
        cpf: null,
        telefone: '11999998888',
        endereco: 'Rua X',
        observacoes: null,
        criadoEm: new Date('2026-01-01'),
        pedidos: [{ numero: 1 }],
        vendas: [{ numero: 2 }],
      });
      prisma.mensagemWhatsApp.findMany.mockResolvedValue([{ conteudo: 'oi' }]);

      const result = await service.exportarCliente('c1');

      expect(prisma.mensagemWhatsApp.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { telefone: '11999998888' } }),
      );
      expect(result.dadosCadastrais.nome).toBe('Maria');
      expect(result.pedidos).toEqual([{ numero: 1 }]);
      expect(result.mensagensWhatsApp).toEqual([{ conteudo: 'oi' }]);
    });

    it('não tenta buscar mensagens quando o cliente não tem telefone cadastrado', async () => {
      prisma.cliente.findUnique.mockResolvedValue({
        nome: 'Sem Telefone',
        telefone: null,
        pedidos: [],
        vendas: [],
      });

      const result = await service.exportarCliente('c2');

      expect(prisma.mensagemWhatsApp.findMany).not.toHaveBeenCalled();
      expect(result.mensagensWhatsApp).toEqual([]);
    });
  });

  describe('anonimizarCliente', () => {
    it('lança 404 quando o cliente não existe', async () => {
      prisma.cliente.findUnique.mockResolvedValue(null);

      await expect(service.anonimizarCliente('inexistente')).rejects.toThrow(NotFoundException);
    });

    it('remove PII do cadastro, apaga mensagens e desidentifica o snapshot dos pedidos', async () => {
      prisma.cliente.findUnique.mockResolvedValue({ id: 'c1', telefone: '11999998888' });

      await service.anonimizarCliente('c1');

      expect(prisma.cliente.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'c1' },
          data: expect.objectContaining({ nome: 'Cliente anonimizado', telefone: null, ativo: false }),
        }),
      );
      expect(prisma.mensagemWhatsApp.deleteMany).toHaveBeenCalledWith({
        where: { telefone: '11999998888' },
      });
      expect(prisma.pedido.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clienteId: 'c1' },
          data: expect.objectContaining({ nomeCliente: 'Cliente anonimizado' }),
        }),
      );
    });

    it('pula a limpeza de mensagens quando o cliente não tinha telefone', async () => {
      prisma.cliente.findUnique.mockResolvedValue({ id: 'c2', telefone: null });

      await service.anonimizarCliente('c2');

      expect(prisma.mensagemWhatsApp.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('expurgarMensagensAntigas', () => {
    it('usa RETENCAO_MENSAGENS_DIAS do ConfigService quando nenhum override é passado', async () => {
      config.get.mockReturnValue(90);
      prisma.mensagemWhatsApp.deleteMany.mockResolvedValue({ count: 3 });

      const result = await service.expurgarMensagensAntigas();

      expect(config.get).toHaveBeenCalledWith('RETENCAO_MENSAGENS_DIAS', 90);
      expect(result).toEqual({ message: '3 mensagem(ns) com mais de 90 dias removida(s).', removidas: 3 });
    });

    it('respeita o override explícito de dias', async () => {
      prisma.mensagemWhatsApp.deleteMany.mockResolvedValue({ count: 0 });

      await service.expurgarMensagensAntigas(30);

      const arg = prisma.mensagemWhatsApp.deleteMany.mock.calls[0][0];
      const limiteEsperado = Date.now() - 30 * 24 * 60 * 60 * 1000;
      expect(arg.where.criadoEm.lt.getTime()).toBeCloseTo(limiteEsperado, -3);
    });
  });
});
