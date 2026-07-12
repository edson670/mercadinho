import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '@core/auth/roles.decorator';
import { ProductsService } from '../application/products.service';
import { UpdateStatusDto } from '@modules/users/presentation/dto/update-status.dto';
import {
  CreateProductDto,
  ProductQueryDto,
  UpdateProductDto,
} from './dto/product.dto';

@ApiTags('Produtos')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  // Leitura liberada a qualquer usuário autenticado (necessária no PDV).
  @Get()
  @ApiOperation({ summary: 'Lista produtos (paginado, com filtros)' })
  list(@Query() query: ProductQueryDto) {
    return this.service.list(query);
  }

  @Get('search')
  @ApiOperation({ summary: 'Busca rápida por nome/código de barras (PDV)' })
  search(@Query('q') q: string) {
    return this.service.search(q);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um produto' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.get(id);
  }

  // Escrita restrita a gestão.
  @Post()
  @Roles(Role.ADMINISTRADOR, Role.GERENTE)
  @ApiOperation({ summary: 'Cria um produto' })
  create(@Body() dto: CreateProductDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMINISTRADOR, Role.GERENTE)
  @ApiOperation({ summary: 'Atualiza um produto' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProductDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/status')
  @Roles(Role.ADMINISTRADOR, Role.GERENTE)
  @ApiOperation({ summary: 'Ativa/inativa um produto' })
  setStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStatusDto) {
    return this.service.setStatus(id, dto.ativo);
  }
}
