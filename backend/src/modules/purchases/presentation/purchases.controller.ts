import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '@core/auth/roles.decorator';
import { CurrentUser, AuthUser } from '@core/auth/current-user.decorator';
import { RegisterPurchaseUseCase } from '../application/register-purchase.use-case';
import { PurchasesQueryService } from '../application/purchases-query.service';
import { CreatePurchaseDto, PurchaseQueryDto } from './dto/purchase.dto';

@ApiTags('Compras')
@ApiBearerAuth()
@Roles(Role.ADMINISTRADOR, Role.GERENTE)
@Controller('purchases')
export class PurchasesController {
  constructor(
    private readonly registerPurchase: RegisterPurchaseUseCase,
    private readonly queries: PurchasesQueryService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Registra uma compra (dá entrada no estoque)' })
  create(@Body() dto: CreatePurchaseDto, @CurrentUser() user: AuthUser) {
    return this.registerPurchase.execute(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Lista compras (paginado, com filtros)' })
  list(@Query() query: PurchaseQueryDto) {
    return this.queries.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha uma compra' })
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.queries.detail(id);
  }
}
