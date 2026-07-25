import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '@core/auth/roles.decorator';
import { LgpdService } from '../application/lgpd.service';
import { ExpurgoMensagensDto } from './dto/expurgo.dto';

@ApiTags('LGPD')
@ApiBearerAuth()
@Roles(Role.ADMINISTRADOR)
@Controller('lgpd')
export class LgpdController {
  constructor(private readonly service: LgpdService) {}

  @Get('clientes/:id/exportar')
  @ApiOperation({ summary: 'Exporta os dados pessoais de um cliente (LGPD art. 18, II)' })
  exportar(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.exportarCliente(id);
  }

  @Post('clientes/:id/anonimizar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Anonimiza os dados pessoais de um cliente (LGPD art. 18, VI)',
    description:
      'Pedidos e vendas permanecem (obrigação legal/contábil), mas deixam de conter dados identificáveis. Ação irreversível.',
  })
  anonimizar(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.anonimizarCliente(id);
  }

  @Post('expurgo-mensagens')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove mensagens de WhatsApp além do prazo de retenção configurado',
    description:
      'Pensado para rodar periodicamente (cron externo). RETENCAO_MENSAGENS_DIAS define o padrão (90 dias).',
  })
  expurgo(@Body() dto: ExpurgoMensagensDto) {
    return this.service.expurgarMensagensAntigas(dto.dias);
  }
}
