import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@core/database/prisma.service';

/**
 * Direitos do titular (LGPD, art. 18) e retenção de dados — achado da análise
 * de segurança (docs/11 §8): o sistema guardava mensagens de WhatsApp
 * indefinidamente, sem exportação nem exclusão a pedido do titular.
 */
@Injectable()
export class LgpdService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** Reúne os dados pessoais que o sistema guarda sobre um cliente (art. 18, II). */
  async exportarCliente(clienteId: string) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: clienteId },
      include: {
        pedidos: {
          select: {
            numero: true,
            status: true,
            total: true,
            criadoEm: true,
            logradouro: true,
            numeroEndereco: true,
            bairro: true,
            cidade: true,
          },
        },
        vendas: { select: { numero: true, total: true, criadoEm: true } },
      },
    });
    if (!cliente) throw new NotFoundException('Cliente não encontrado.');

    const mensagens = cliente.telefone
      ? await this.prisma.mensagemWhatsApp.findMany({
          where: { telefone: cliente.telefone },
          select: { direcao: true, conteudo: true, criadoEm: true },
          orderBy: { criadoEm: 'asc' },
        })
      : [];

    return {
      geradoEm: new Date().toISOString(),
      dadosCadastrais: {
        nome: cliente.nome,
        cpf: cliente.cpf,
        telefone: cliente.telefone,
        endereco: cliente.endereco,
        observacoes: cliente.observacoes,
        criadoEm: cliente.criadoEm,
      },
      pedidos: cliente.pedidos,
      vendas: cliente.vendas,
      mensagensWhatsApp: mensagens,
    };
  }

  /**
   * Direito de eliminação (art. 18, VI) — anonimiza em vez de apagar as
   * transações: pedidos e vendas permanecem por obrigação legal/contábil
   * (fiscal, auditoria de estoque), mas deixam de ser atribuíveis à pessoa.
   * As mensagens de WhatsApp, sem essa exigência de retenção, são removidas.
   */
  async anonimizarCliente(clienteId: string) {
    const cliente = await this.prisma.cliente.findUnique({ where: { id: clienteId } });
    if (!cliente) throw new NotFoundException('Cliente não encontrado.');

    const telefoneAnterior = cliente.telefone;

    await this.prisma.$transaction(async (tx) => {
      await tx.cliente.update({
        where: { id: clienteId },
        data: {
          nome: 'Cliente anonimizado',
          cpf: null,
          telefone: null,
          endereco: null,
          observacoes: null,
          ativo: false,
        },
      });

      if (telefoneAnterior) {
        await tx.mensagemWhatsApp.deleteMany({ where: { telefone: telefoneAnterior } });
        // A sessão de catálogo também guarda telefone e nome. Deixá-la para
        // trás anulava a anonimização: bastava o link ainda válido para o
        // dado voltar a ser atribuível à pessoa.
        await tx.sessaoCatalogo.deleteMany({ where: { telefone: telefoneAnterior } });
      }

      // Pedidos guardam um retrato do endereço/telefone no momento da compra
      // (snapshot imutável, ver docs/10) — precisa ser desidentificado à parte.
      await tx.pedido.updateMany({
        where: { clienteId },
        data: {
          nomeCliente: 'Cliente anonimizado',
          telefone: '0000000000',
          logradouro: '—',
          numeroEndereco: '—',
          complemento: null,
          bairro: '—',
          referencia: null,
        },
      });
    });

    return { message: 'Dados pessoais do cliente anonimizados.' };
  }

  /**
   * Expurgo por retenção (RETENCAO_MENSAGENS_DIAS, padrão 90) — o item mais
   * sensível apontado na análise: conversas inteiras guardadas sem prazo.
   * Pensado para rodar periodicamente (cron), mas exposto como ação manual
   * também (POST /lgpd/expurgo-mensagens).
   */
  async expurgarMensagensAntigas(diasOverride?: number) {
    const dias = diasOverride ?? this.config.get<number>('RETENCAO_MENSAGENS_DIAS', 90);
    const limite = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);

    const { count } = await this.prisma.mensagemWhatsApp.deleteMany({
      where: { criadoEm: { lt: limite } },
    });

    return {
      message: `${count} mensagem(ns) com mais de ${dias} dias removida(s).`,
      removidas: count,
    };
  }
}
