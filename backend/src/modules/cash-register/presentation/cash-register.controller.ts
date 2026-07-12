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
import { Role } from '@prisma/client';
import { Roles } from '@core/auth/roles.decorator';
import { CurrentUser, AuthUser } from '@core/auth/current-user.decorator';
import { CashRegisterService } from '../application/cash-register.service';
import {
  CashHistoryQueryDto,
  CashMovementDto,
  CloseCashDto,
  OpenCashDto,
} from './dto/cash-register.dto';

@ApiTags('Caixa')
@ApiBearerAuth()
@Controller('cash-register')
export class CashRegisterController {
  constructor(private readonly service: CashRegisterService) {}

  @Get('current')
  @ApiOperation({ summary: 'Caixa aberto do operador (ou null)' })
  current(@CurrentUser() user: AuthUser) {
    return this.service.getCurrent(user.id);
  }

  @Post('open')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Abre o caixa' })
  open(@Body() dto: OpenCashDto, @CurrentUser() user: AuthUser) {
    return this.service.open(user.id, dto.valorAbertura);
  }

  @Post(':id/movements')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registra sangria/suprimento' })
  movement(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CashMovementDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.addMovement(id, user.id, dto.tipo, dto.valor, dto.motivo);
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fecha o caixa e consolida totais' })
  close(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CloseCashDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.close(id, user.id, dto);
  }

  @Get()
  @Roles(Role.ADMINISTRADOR, Role.GERENTE)
  @ApiOperation({ summary: 'Histórico de caixas (paginado)' })
  history(@Query() query: CashHistoryQueryDto) {
    return this.service.history(query);
  }
}
