import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '@core/auth/public.decorator';
import { CriarPedidoUseCase } from '../application/criar-pedido.use-case';
import { OrdersQueryService } from '../application/orders-query.service';
import { CreateOrderDto } from './dto/order.dto';

/**
 * Rotas públicas consumidas pelo catálogo web (cliente final, sem login).
 * Rate limit agressivo: são a superfície exposta à internet.
 */
@ApiTags('Público — Pedidos')
@Public()
@Controller('public/orders')
export class PublicOrdersController {
  constructor(
    private readonly criarPedido: CriarPedidoUseCase,
    private readonly queries: OrdersQueryService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Cria um pedido a partir do catálogo (idempotente por chave)' })
  create(@Body() dto: CreateOrderDto) {
    return this.criarPedido.execute(dto);
  }

  @Get(':trackingToken/status')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Acompanhamento do pedido pelo cliente (token opaco)' })
  status(@Param('trackingToken') trackingToken: string) {
    return this.queries.publicStatus(trackingToken);
  }
}
