import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '@core/auth/roles.decorator';
import { ChartPeriod, DashboardService } from '../application/dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Indicadores gerais (dia/mês/fiado/estoque/últimas vendas)' })
  summary() {
    return this.service.summary();
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
