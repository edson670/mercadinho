import { Inject, Injectable, Logger } from '@nestjs/common';
import { DirecaoMensagem, StatusEnvioMensagem } from '@prisma/client';
import { PrismaService } from '@core/database/prisma.service';
import { IWhatsAppGateway, WHATSAPP_GATEWAY } from '../domain/whatsapp.gateway';
import { toWhatsAppNumber } from '../domain/phone.util';

/**
 * Único ponto de saída de mensagens: grava o registro, tenta enviar e
 * marca ENVIADA/FALHOU. Nunca lança — falha de WhatsApp não pode derrubar
 * a criação de um pedido nem a mudança de status.
 */
@Injectable()
export class WhatsAppMessengerService {
  private readonly logger = new Logger(WhatsAppMessengerService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(WHATSAPP_GATEWAY) private readonly gateway: IWhatsAppGateway,
  ) {}

  async send(telefone: string, conteudo: string, pedidoId?: string): Promise<void> {
    const registro = await this.prisma.mensagemWhatsApp.create({
      data: {
        telefone,
        conteudo,
        pedidoId,
        direcao: DirecaoMensagem.ENVIADA,
        statusEnvio: StatusEnvioMensagem.PENDENTE,
      },
    });

    try {
      await this.gateway.sendText(toWhatsAppNumber(telefone), conteudo);
      await this.prisma.mensagemWhatsApp.update({
        where: { id: registro.id },
        data: { statusEnvio: StatusEnvioMensagem.ENVIADA },
      });
    } catch (err) {
      const erro = err instanceof Error ? err.message : String(err);
      this.logger.error(`Falha ao enviar mensagem para ${telefone}: ${erro}`);
      await this.prisma.mensagemWhatsApp
        .update({
          where: { id: registro.id },
          data: { statusEnvio: StatusEnvioMensagem.FALHOU, erro: erro.slice(0, 500) },
        })
        .catch(() => undefined);
    }
  }

  /** Registra uma mensagem recebida do cliente (auditoria do atendimento). */
  async logIncoming(telefone: string, conteudo: string): Promise<void> {
    await this.prisma.mensagemWhatsApp.create({
      data: {
        telefone,
        conteudo,
        direcao: DirecaoMensagem.RECEBIDA,
        statusEnvio: StatusEnvioMensagem.ENVIADA, // recebida não tem envio pendente
      },
    });
  }

  /**
   * Anti-loop/anti-spam: já respondemos este número há pouco tempo?
   * Protege contra eco de webhook e cliente mandando várias mensagens seguidas.
   */
  async respondeuRecentemente(telefone: string, janelaMinutos = 5): Promise<boolean> {
    const desde = new Date(Date.now() - janelaMinutos * 60_000);
    const recente = await this.prisma.mensagemWhatsApp.findFirst({
      where: {
        telefone,
        direcao: DirecaoMensagem.ENVIADA,
        criadoEm: { gte: desde },
        // Só saudações contam. Notificação de pedido tem pedidoId e é
        // disparada pela loja, não em resposta ao cliente: incluí-la fazia um
        // "saiu para entrega" calar o link do catálogo por 5 minutos para
        // quem escrevesse logo em seguida.
        pedidoId: null,
      },
      select: { id: true },
    });
    return Boolean(recente);
  }
}
