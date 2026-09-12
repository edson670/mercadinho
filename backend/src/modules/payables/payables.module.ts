import { Module } from '@nestjs/common';
import { CriarContaPagarUseCase } from './application/criar-conta-pagar.use-case';
import { AtualizarContaPagarUseCase } from './application/atualizar-conta-pagar.use-case';
import { RegistrarPagamentoContaUseCase } from './application/registrar-pagamento-conta.use-case';
import { CancelarContaPagarUseCase } from './application/cancelar-conta-pagar.use-case';
import { PayablesQueryService } from './application/payables-query.service';
import { PayablesController } from './presentation/payables.controller';

@Module({
  controllers: [PayablesController],
  providers: [
    CriarContaPagarUseCase,
    AtualizarContaPagarUseCase,
    RegistrarPagamentoContaUseCase,
    CancelarContaPagarUseCase,
    PayablesQueryService,
  ],
})
export class PayablesModule {}
