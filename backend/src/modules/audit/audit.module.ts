import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from './application/audit.interceptor';
import { AuditQueryService } from './application/audit-query.service';
import { AuditController } from './presentation/audit.controller';

@Module({
  controllers: [AuditController],
  providers: [
    AuditQueryService,
    // Registrado como interceptor global: audita toda requisição mutável da API.
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AuditModule {}
