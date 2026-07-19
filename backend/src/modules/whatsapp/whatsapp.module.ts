import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WHATSAPP_GATEWAY } from './domain/whatsapp.gateway';
import { EvolutionWhatsAppGateway } from './infra/evolution-whatsapp.gateway';
import { LoggingWhatsAppGateway } from './infra/logging-whatsapp.gateway';
import { WhatsAppMessengerService } from './application/whatsapp-messenger.service';
import { WhatsAppOrderNotifier } from './application/whatsapp-order-notifier';
import { CatalogSessionService } from './application/catalog-session.service';
import { HandleIncomingMessageUseCase } from './application/handle-incoming-message.use-case';
import { EvolutionWebhookController } from './presentation/evolution-webhook.controller';

@Module({
  controllers: [EvolutionWebhookController],
  providers: [
    // Sem credenciais da Evolution, cai no gateway de log: o sistema de
    // pedidos continua 100% funcional (ver docs/10-pedidos-whatsapp.md).
    {
      provide: WHATSAPP_GATEWAY,
      useFactory: (config: ConfigService) => {
        const evolution = new EvolutionWhatsAppGateway(config);
        return evolution.isConfigured() ? evolution : new LoggingWhatsAppGateway();
      },
      inject: [ConfigService],
    },
    WhatsAppMessengerService,
    WhatsAppOrderNotifier,
    CatalogSessionService,
    HandleIncomingMessageUseCase,
  ],
  exports: [WhatsAppOrderNotifier],
})
export class WhatsAppModule {}
