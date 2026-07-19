import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IWhatsAppGateway } from '../domain/whatsapp.gateway';

const TIMEOUT_MS = 10_000;

/**
 * Adaptador da Evolution API (v2): POST {base}/message/sendText/{instance}
 * com header `apikey`. Ver docs/10-pedidos-whatsapp.md (ADR A5).
 */
@Injectable()
export class EvolutionWhatsAppGateway implements IWhatsAppGateway {
  private readonly logger = new Logger(EvolutionWhatsAppGateway.name);

  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly instance: string;

  constructor(config: ConfigService) {
    this.baseUrl = (config.get<string>('EVOLUTION_BASE_URL') ?? '').replace(/\/+$/, '');
    this.apiKey = config.get<string>('EVOLUTION_API_KEY') ?? '';
    this.instance = config.get<string>('EVOLUTION_INSTANCE') ?? '';
  }

  isConfigured(): boolean {
    return Boolean(this.baseUrl && this.apiKey && this.instance);
  }

  async sendText(telefoneE164: string, mensagem: string): Promise<void> {
    const url = `${this.baseUrl}/message/sendText/${encodeURIComponent(this.instance)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: this.apiKey },
        body: JSON.stringify({ number: telefoneE164, text: mensagem }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const corpo = await res.text().catch(() => '');
        throw new Error(`Evolution API respondeu ${res.status}: ${corpo.slice(0, 300)}`);
      }
      this.logger.log(`Mensagem enviada para ${telefoneE164}`);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`Timeout de ${TIMEOUT_MS}ms ao contatar a Evolution API`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}
