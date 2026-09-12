import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@core/database/prisma.service';
import { WhatsAppMessengerService } from './whatsapp-messenger.service';
import { CatalogSessionService, VALIDADE_HORAS } from './catalog-session.service';
import { saudacaoComCatalogo } from './message-templates';
import { isGroupJid, toNationalDigits } from '../domain/phone.util';

export interface IncomingMessage {
  jid: string;
  fromMe: boolean;
  texto: string;
  pushName?: string;
}

/**
 * Toda mensagem recebida responde com saudação + link do catálogo.
 * Não há máquina de estados de conversa: o checkout inteiro acontece no
 * catálogo web (ADR A6), o que elimina o ponto mais frágil de bots de pedido.
 */
@Injectable()
export class HandleIncomingMessageUseCase {
  private readonly logger = new Logger(HandleIncomingMessageUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messenger: WhatsAppMessengerService,
    private readonly sessions: CatalogSessionService,
  ) {}

  async execute(msg: IncomingMessage): Promise<{ respondido: boolean; motivo?: string }> {
    if (msg.fromMe) return { respondido: false, motivo: 'mensagem própria' };
    if (isGroupJid(msg.jid)) return { respondido: false, motivo: 'mensagem de grupo' };

    const telefone = toNationalDigits(msg.jid);
    if (!telefone || telefone.length < 10) {
      return { respondido: false, motivo: 'telefone inválido' };
    }

    await this.messenger.logIncoming(telefone, msg.texto || '(sem texto)');

    // Evita responder em rajada quando o cliente manda várias mensagens.
    if (await this.messenger.respondeuRecentemente(telefone)) {
      return { respondido: false, motivo: 'já respondido recentemente' };
    }

    const cliente = await this.prisma.cliente.findFirst({
      where: { telefone },
      select: { nome: true },
    });
    const nome = cliente?.nome ?? msg.pushName;

    const config = await this.prisma.configuracao.findFirst({ select: { nome: true } });
    const empresa = config?.nome ?? 'nosso mercadinho';

    const link = await this.sessions.criarLink(telefone, nome);
    await this.messenger.send(
      telefone,
      saudacaoComCatalogo(empresa, link, {
        nome,
        validadeHoras: VALIDADE_HORAS,
        jaCliente: Boolean(cliente),
      }),
    );

    this.logger.log(`Saudação enviada para ${telefone}`);
    return { respondido: true };
  }
}
