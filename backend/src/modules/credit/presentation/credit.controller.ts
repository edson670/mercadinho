import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '@core/auth/current-user.decorator';
import { RegisterPaymentUseCase } from '../application/register-payment.use-case';
import { CreditQueryService } from '../application/credit-query.service';
import { CreditQueryDto, RegisterPaymentDto } from './dto/credit.dto';

@ApiTags('Fiado')
@ApiBearerAuth()
@Controller('credit')
export class CreditController {
  constructor(
    private readonly registerPayment: RegisterPaymentUseCase,
    private readonly queries: CreditQueryService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista fiados (paginado, filtro por status/cliente)' })
  list(@Query() query: CreditQueryDto) {
    return this.queries.list(query);
  }

  @Get('overdue')
  @ApiOperation({ summary: 'Clientes inadimplentes (saldo em aberto)' })
  overdue() {
    return this.queries.overdue();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um fiado com pagamentos' })
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.queries.detail(id);
  }

  @Post(':id/payments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registra pagamento (total/parcial)' })
  pay(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RegisterPaymentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.registerPayment.execute(id, dto, user.id);
  }
}
