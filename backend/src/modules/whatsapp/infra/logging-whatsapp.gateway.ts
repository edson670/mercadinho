import { Injectable, Logger } from '@nestjs/common';
import { IWhatsAppGateway } from '../domain/whatsapp.gateway';

/**
 * Usado quando as credenciais da Evolution API não estão configuradas.
 * Mantém todo o sistema de pedidos funcional (o histórico de mensagens
 * continua sendo gravado) sem exigir uma instância de WhatsApp no ar.
 */
@Injectable()
export class LoggingWhatsAppGateway implements IWhatsAppGateway {
  private readonly logger = new Logger(LoggingWhatsAppGateway.name);

  isConfigured(): boolean {
    return false;
  }

  async sendText(telefoneE164: string, mensagem: string): Promise<void> {
    this.logger.warn(
      `[WhatsApp não configurado] mensagem para ${telefoneE164}:\n${mensagem}`,
    );
  }
}
