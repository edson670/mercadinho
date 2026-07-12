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
import { UpdateStatusDto } from '@modules/users/presentation/dto/update-status.dto';
import { CustomersService } from '../application/customers.service';
import { CreateCustomerDto, CustomerQueryDto, UpdateCustomerDto } from './dto/customer.dto';

@ApiTags('Clientes')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private readonly service: CustomersService) {}

  // Todos os perfis podem cadastrar/consultar (necessário no PDV/fiado).
  @Post()
  @ApiOperation({ summary: 'Cria um cliente' })
  create(@Body() dto: CreateCustomerDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista clientes (paginado)' })
  list(@Query() query: CustomerQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um cliente' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.get(id);
  }

  // Alterações restritas a gestão.
  @Patch(':id')
  @Roles(Role.ADMINISTRADOR, Role.GERENTE)
  @ApiOperation({ summary: 'Atualiza um cliente' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCustomerDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/status')
  @Roles(Role.ADMINISTRADOR, Role.GERENTE)
  @ApiOperation({ summary: 'Ativa/inativa um cliente' })
  setStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStatusDto) {
    return this.service.setStatus(id, dto.ativo);
  }
}
