import { Module } from '@nestjs/common';
import { CashRegisterService } from './application/cash-register.service';
import { CashRegisterController } from './presentation/cash-register.controller';

@Module({
  controllers: [CashRegisterController],
  providers: [CashRegisterService],
  exports: [CashRegisterService], // usado pelo PDV (Etapa 6) para validar caixa aberto
})
export class CashRegisterModule {}
