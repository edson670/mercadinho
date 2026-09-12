import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthUser, CurrentUser } from '@core/auth/current-user.decorator';
import { Roles } from '@core/auth/roles.decorator';
import { CriarContaPagarUseCase } from '../application/criar-conta-pagar.use-case';
import { AtualizarContaPagarUseCase } from '../application/atualizar-conta-pagar.use-case';
import { RegistrarPagamentoContaUseCase } from '../application/registrar-pagamento-conta.use-case';
import { CancelarContaPagarUseCase } from '../application/cancelar-conta-pagar.use-case';
import { PayablesQueryService } from '../application/payables-query.service';
import {
  CreatePayableDto,
  PayableQueryDto,
  RegisterPayablePaymentDto,
  UpdatePayableDto,
} from './dto/payable.dto';

/**
 * Contas a pagar é dado financeiro da loja, não da operação de balcão:
 * restrito a administrador e gerente (o caixa não enxerga o módulo).
 */
@ApiTags('Contas a pagar')
@ApiBearerAuth()
@Roles(Role.ADMINISTRADOR, Role.GERENTE)
@Controller('payables')
export class PayablesController {
  constructor(
    private readonly criar: CriarContaPagarUseCase,
    private readonly atualizar: AtualizarContaPagarUseCase,
    private readonly registrarPagamento: RegistrarPagamentoContaUseCase,
    private readonly cancelar: CancelarContaPagarUseCase,
    private readonly queries: PayablesQueryService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista contas a pagar (paginado, com filtros)' })
  list(@Query() query: PayableQueryDto) {
    return this.queries.list(query);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Resumo financeiro: em aberto, vencido, a vencer e pago no mês' })
  summary() {
    return this.queries.summary();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha uma conta com seus pagamentos' })
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.queries.detail(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cria uma conta (ou a série mensal, via repetirMeses)' })
  create(@Body() dto: CreatePayableDto, @CurrentUser() user: AuthUser) {
    return this.criar.execute(dto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edita uma conta ainda em aberto' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePayableDto) {
    return this.atualizar.execute(id, dto);
  }

  @Post(':id/payments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registra pagamento (total ou parcial)' })
  pay(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RegisterPayablePaymentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.registrarPagamento.execute(id, dto, user.id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancela a conta (opcionalmente as futuras da mesma série)' })
  @ApiQuery({ name: 'futuras', required: false, type: Boolean })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('futuras', new ParseBoolPipe({ optional: true })) futuras?: boolean,
  ) {
    return this.cancelar.execute(id, futuras ?? false);
  }
}
