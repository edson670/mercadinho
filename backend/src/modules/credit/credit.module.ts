import { Module } from '@nestjs/common';
import { RegisterPaymentUseCase } from './application/register-payment.use-case';
import { CreditQueryService } from './application/credit-query.service';
import { CreditController } from './presentation/credit.controller';

@Module({
  controllers: [CreditController],
  providers: [RegisterPaymentUseCase, CreditQueryService],
})
export class CreditModule {}
