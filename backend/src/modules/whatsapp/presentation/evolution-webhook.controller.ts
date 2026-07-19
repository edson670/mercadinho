import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Post,
  Query,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '@core/auth/public.decorator';
import { timingSafeEqual } from 'node:crypto';
import { HandleIncomingMessageUseCase } from '../application/handle-incoming-message.use-case';
import { CatalogSessionService } from '../application/catalog-session.service';
import { IWhatsAppGateway, WHATSAPP_GATEWAY } from '../domain/whatsapp.gateway';

/** Payload de `messages.upsert` da Evolution API (campos que usamos). */
interface EvolutionWebhookBody {
  event?: string;
  data?: {
    key?: { remoteJid?: string; fromMe?: boolean };
    message?: {
      conversation?: string;
      extendedTextMessage?: { text?: string };
    };
    pushName?: string;
  };
}

@ApiTags('Público — WhatsApp')
@Public()
@Controller()
export class EvolutionWebhookController {
  private readonly logger = new Logger(EvolutionWebhookController.name);
  private readonly webhookSecret: string;

  constructor(
    private readonly handleIncoming: HandleIncomingMessageUseCase,
    private readonly sessions: CatalogSessionService,
    private readonly config: ConfigService,
    @Inject(WHATSAPP_GATEWAY) private readonly gateway: IWhatsAppGateway,
  ) {
    this.webhookSecret = this.config.get<string>('WEBHOOK_SECRET') ?? '';
  }

  @Post('webhooks/evolution')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @ApiExcludeEndpoint()
  async receive(
    @Body() body: EvolutionWebhookBody,
    @Headers('x-webhook-secret') headerSecret?: string,
    @Query('secret') querySecret?: string,
  ) {
    this.assertSecret(headerSecret ?? querySecret);

    // Só nos interessam mensagens novas de clientes.
    if (body.event && body.event !== 'messages.upsert') {
      return { ignorado: true, motivo: `evento ${body.event}` };
    }

    const jid = body.data?.key?.remoteJid ?? '';
    const texto =
      body.data?.message?.conversation ??
      body.data?.message?.extendedTextMessage?.text ??
      '';

    if (!jid) return { ignorado: true, motivo: 'sem remetente' };

    const resultado = await this.handleIncoming.execute({
      jid,
      fromMe: body.data?.key?.fromMe ?? false,
      texto,
      pushName: body.data?.pushName,
    });

    return { ok: true, ...resultado };
  }

  @Get('public/whatsapp/session')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Resolve o token do link para pré-preencher o checkout' })
  resolveSession(@Query('s') token: string) {
    if (!token) throw new UnauthorizedException('Token ausente.');
    return this.sessions.resolver(token);
  }

  @Get('public/whatsapp/health')
  @ApiOperation({ summary: 'Indica se a integração com a Evolution API está configurada' })
  health() {
    return {
      configurado: this.gateway.isConfigured(),
      webhookProtegido: Boolean(this.webhookSecret),
    };
  }

  /** Comparação em tempo constante evita vazar o segredo por timing. */
  private assertSecret(recebido?: string) {
    if (!this.webhookSecret) {
      throw new ServiceUnavailableException(
        'WEBHOOK_SECRET não configurado — webhook desabilitado por segurança.',
      );
    }
    const esperado = Buffer.from(this.webhookSecret);
    const informado = Buffer.from(recebido ?? '');
    if (
      esperado.length !== informado.length ||
      !timingSafeEqual(esperado, informado)
    ) {
      this.logger.warn('Webhook recusado: segredo inválido');
      throw new UnauthorizedException('Segredo do webhook inválido.');
    }
  }
}
