import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '@core/auth/roles.decorator';
import { AuthUser, CurrentUser } from '@core/auth/current-user.decorator';
import { ChartPeriod, DashboardService } from '../application/dashboard.service';

const VE_INDICADORES_FINANCEIROS: Role[] = [Role.ADMINISTRADOR, Role.GERENTE];

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Indicadores gerais (dia/mês/estoque/últimas vendas)',
    description:
      'Faturamento acumulado, fiado em aberto e inadimplentes só para ADMINISTRADOR/GERENTE.',
  })
  summary(@CurrentUser() user: AuthUser) {
    return this.service.summary(VE_INDICADORES_FINANCEIROS.includes(user.role as Role));
  }

  @Get('sales-chart')
  @Roles(Role.ADMINISTRADOR, Role.GERENTE)
  @ApiOperation({ summary: 'Série de vendas por período' })
  @ApiQuery({ name: 'period', enum: ['7d', '30d', '12m'], required: false })
  salesChart(@Query('period') period?: ChartPeriod) {
    return this.service.salesChart(period ?? '7d');
  }

  @Get('top-products')
  @Roles(Role.ADMINISTRADOR, Role.GERENTE)
  @ApiOperation({ summary: 'Produtos mais vendidos' })
  topProducts() {
    return this.service.topProducts();
  }
}
