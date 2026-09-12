import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CatalogSessionService } from './catalog-session.service';

/**
 * Agendador do expurgo de sessões de catálogo vencidas. Existe separado do
 * CatalogSessionService só para isolar o import de @nestjs/schedule, que é
 * ESM e inviabilizaria os testes unitários daquele serviço.
 */
@Injectable()
export class LimpezaSessoesService {
  private readonly logger = new Logger(LimpezaSessoesService.name);

  constructor(private readonly sessions: CatalogSessionService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async executar(): Promise<void> {
    try {
      await this.sessions.purgarExpiradas();
    } catch (err) {
      // Limpeza não pode derrubar a aplicação — na próxima hora tenta de novo.
      this.logger.error('Falha ao purgar sessões de catálogo expiradas', err);
    }
  }
}
