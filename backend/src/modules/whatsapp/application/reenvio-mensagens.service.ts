import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StatusEnvioMensagem } from '@prisma/client';
import { PrismaService } from '@core/database/prisma.service';
import { IWhatsAppGateway, WHATSAPP_GATEWAY } from '../domain/whatsapp.gateway';
import { toWhatsAppNumber } from '../domain/phone.util';

/** Depois disso a mensagem é considerada perdida e para de ser tentada. */
const MAX_TENTATIVAS = 5;
/** Teto por rodada, para uma fila acumulada não virar rajada na Evolution. */
const LOTE = 20;
/** Mensagem velha demais perdeu o sentido ("saiu para entrega" de ontem). */
const JANELA_HORAS = 24;

/**
 * Reenvia mensagens que falharam. A falha de envio já era registrada
 * (statusEnvio = FALHOU), mas ninguém voltava nela: uma instabilidade de
 * segundos na Evolution API fazia o cliente simplesmente nunca receber a
 * confirmação do pedido, em silêncio.
 *
 * Só reenvia o que ainda faz sentido entregar e desiste depois de algumas
 * tentativas — insistir para sempre em um número inválido só encheria a fila.
 */
@Injectable()
export class ReenvioMensagensService {
  private readonly logger = new Logger(ReenvioMensagensService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(WHATSAPP_GATEWAY) private readonly gateway: IWhatsAppGateway,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async reenviarPendentes(): Promise<void> {
    if (!this.gateway.isConfigured()) return;

    const desde = new Date(Date.now() - JANELA_HORAS * 60 * 60_000);
    const pendentes = await this.prisma.mensagemWhatsApp.findMany({
      where: {
        statusEnvio: StatusEnvioMensagem.FALHOU,
        tentativas: { lt: MAX_TENTATIVAS },
        criadoEm: { gte: desde },
      },
      orderBy: { criadoEm: 'asc' },
      take: LOTE,
    });
    if (pendentes.length === 0) return;

    this.logger.log(`Reenviando ${pendentes.length} mensagem(ns) que falharam`);

    for (const msg of pendentes) {
      // Marca a tentativa ANTES de tentar: se o processo morrer no meio do
      // envio, a mensagem não fica sendo tentada infinitamente.
      await this.prisma.mensagemWhatsApp.update({
        where: { id: msg.id },
        data: { tentativas: { increment: 1 } },
      });

      try {
        await this.gateway.sendText(toWhatsAppNumber(msg.telefone), msg.conteudo);
        await this.prisma.mensagemWhatsApp.update({
          where: { id: msg.id },
          data: { statusEnvio: StatusEnvioMensagem.ENVIADA, erro: null },
        });
      } catch (err) {
        const erro = err instanceof Error ? err.message : String(err);
        await this.prisma.mensagemWhatsApp.update({
          where: { id: msg.id },
          data: { erro: erro.slice(0, 500) },
        });
        this.logger.warn(`Reenvio falhou para ${msg.telefone}: ${erro}`);
      }
    }
  }
}
