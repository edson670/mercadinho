import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '@core/auth/roles.decorator';
import { CurrentUser, AuthUser } from '@core/auth/current-user.decorator';
import { StockService } from '../application/stock.service';
import { StockQueryService } from '../application/stock-query.service';
import { MovementQueryDto, StockAdjustmentDto, StockEntryDto } from './dto/stock.dto';

@ApiTags('Estoque')
@ApiBearerAuth()
@Roles(Role.ADMINISTRADOR, Role.GERENTE)
@Controller('stock')
export class StockController {
  constructor(
    private readonly stock: StockService,
    private readonly queries: StockQueryService,
  ) {}

  @Post('entries')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Entrada manual de estoque' })
  entry(@Body() dto: StockEntryDto, @CurrentUser() user: AuthUser) {
    return this.stock.registerEntry(dto.produtoId, dto.quantidade, user.id, dto.motivo);
  }

  @Post('adjustments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Ajuste de estoque para quantidade absoluta' })
  adjust(@Body() dto: StockAdjustmentDto, @CurrentUser() user: AuthUser) {
    return this.stock.adjust(dto.produtoId, dto.novaQuantidade, user.id, dto.motivo);
  }

  @Get('movements')
  @ApiOperation({ summary: 'Histórico de movimentações (paginado, com filtros)' })
  movements(@Query() query: MovementQueryDto) {
    return this.queries.listMovements(query);
  }

  @Get('low')
  @ApiOperation({ summary: 'Produtos com estoque no/abaixo do mínimo' })
  low() {
    return this.queries.listLowStock();
  }
}
