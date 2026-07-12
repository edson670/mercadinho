import { Injectable, Logger } from '@nestjs/common';

/**
 * Adapter de envio de e-mail.
 * Implementação de desenvolvimento: apenas registra no log.
 * Substituível por SMTP/provedor real sem alterar o AuthService.
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  async sendPasswordReset(email: string, token: string): Promise<void> {
    // Em produção: enviar link para /reset-password?token=...
    this.logger.warn(
      `[DEV] Recuperação de senha para ${email} — token: ${token}`,
    );
  }
}
