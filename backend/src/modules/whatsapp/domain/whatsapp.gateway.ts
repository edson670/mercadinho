export const WHATSAPP_GATEWAY = Symbol('WHATSAPP_GATEWAY');

/**
 * Porta de saída para envio de mensagens no WhatsApp.
 * Implementações: EvolutionWhatsAppGateway (produção) e
 * LoggingWhatsAppGateway (sem credenciais configuradas).
 * Trocar de provedor (Cloud API oficial, Baileys...) não afeta os use cases.
 */
export interface IWhatsAppGateway {
  /** Envia texto. Deve lançar em caso de falha — quem chama registra o erro. */
  sendText(telefoneE164: string, mensagem: string): Promise<void>;

  /** Indica se o provedor está realmente configurado (para diagnóstico/health). */
  isConfigured(): boolean;
}
