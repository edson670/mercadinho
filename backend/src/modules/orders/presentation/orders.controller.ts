import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '@core/auth/roles.decorator';
import { CurrentUser, AuthUser } from '@core/auth/current-user.decorator';
import { AtualizarStatusPedidoUseCase } from '../application/atualizar-status-pedido.use-case';
import { CancelarPedidoUseCase } from '../application/cancelar-pedido.use-case';
import { OrdersQueryService } from '../application/orders-query.service';
import { OrderQueryDto, UpdateOrderStatusDto } from './dto/order.dto';

@ApiTags('Pedidos WhatsApp')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly atualizarStatus: AtualizarStatusPedidoUseCase,
    private readonly cancelar: CancelarPedidoUseCase,
    private readonly queries: OrdersQueryService,
  ) {}

  // Todos os perfis operam pedidos (o caixa separa/despacha).
  @Get()
  @ApiOperation({ summary: 'Lista pedidos (filtros: status, pagamento, busca, período)' })
  list(@Query() query: OrderQueryDto) {
    return this.queries.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um pedido (itens, endereço, histórico)' })
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.queries.detail(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Avança o status do pedido (notifica o cliente)' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.atualizarStatus.execute(id, dto.status, user.id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMINISTRADOR, Role.GERENTE)
  @ApiOperation({ summary: 'Cancela o pedido e estorna o estoque' })
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.cancelar.execute(id, user.id);
  }
}
