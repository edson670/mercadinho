import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { validateEnv } from './core/config/env.validation';
import { PrismaModule } from './core/database/prisma.module';
import { SecurityModule } from './core/security/security.module';
import { JwtAuthGuard } from './core/auth/jwt-auth.guard';
import { RolesGuard } from './core/auth/roles.guard';
import { HealthController } from './core/health/health.controller';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ProductsModule } from './modules/products/products.module';
import { CustomersModule } from './modules/customers/customers.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { StockModule } from './modules/stock/stock.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { CashRegisterModule } from './modules/cash-register/cash-register.module';
import { SalesModule } from './modules/sales/sales.module';
import { CreditModule } from './modules/credit/credit.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AuditModule } from './modules/audit/audit.module';
import { SettingsModule } from './modules/settings/settings.module';
import { OrdersModule } from './modules/orders/orders.module';
import { LgpdModule } from './modules/lgpd/lgpd.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    // Habilita os @Cron da aplicação (hoje: reenvio de mensagens WhatsApp
    // que falharam — ver ReenvioMensagensService).
    ScheduleModule.forRoot(),
    PrismaModule,
    SecurityModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    ProductsModule,
    CustomersModule,
    SuppliersModule,
    StockModule,
    PurchasesModule,
    CashRegisterModule,
    SalesModule,
    CreditModule,
    DashboardModule,
    ReportsModule,
    AuditModule,
    SettingsModule,
    OrdersModule,
    LgpdModule,
  ],
  controllers: [HealthController],
  providers: [
    // Ordem importa: rate limit → autenticação (JWT) → autorização (RBAC).
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
