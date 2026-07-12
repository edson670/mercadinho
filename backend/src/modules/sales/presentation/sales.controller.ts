import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '@core/auth/roles.decorator';
import { CurrentUser, AuthUser } from '@core/auth/current-user.decorator';
import { FinalizarVendaUseCase } from '../application/finalizar-venda.use-case';
import { CancelarVendaUseCase } from '../application/cancelar-venda.use-case';
import { SalesQueryService } from '../application/sales-query.service';
import { CreateSaleDto, SaleQueryDto } from './dto/sale.dto';

@ApiTags('Vendas')
@ApiBearerAuth()
@Controller('sales')
export class SalesController {
  constructor(
    private readonly finalizar: FinalizarVendaUseCase,
    private readonly cancelar: CancelarVendaUseCase,
    private readonly queries: SalesQueryService,
  ) {}

  // Todos os perfis operam o PDV.
  @Post()
  @ApiOperation({ summary: 'Finaliza uma venda (baixa estoque, vincula ao caixa)' })
  create(@Body() dto: CreateSaleDto, @CurrentUser() user: AuthUser) {
    return this.finalizar.execute(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Lista vendas (paginado, com filtros)' })
  list(@Query() query: SaleQueryDto) {
    return this.queries.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha uma venda' })
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.queries.detail(id);
  }

  // Cancelamento restrito a gestão.
  @Post(':id/cancel')
  @Roles(Role.ADMINISTRADOR, Role.GERENTE)
  @ApiOperation({ summary: 'Cancela uma venda e estorna o estoque' })
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.cancelar.execute(id, user.id);
  }
}
