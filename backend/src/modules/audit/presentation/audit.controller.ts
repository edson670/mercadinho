import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '@core/auth/roles.decorator';
import { AuditQueryService } from '../application/audit-query.service';
import { AuditQueryDto } from './dto/audit.dto';

@ApiTags('Auditoria')
@ApiBearerAuth()
@Roles(Role.ADMINISTRADOR, Role.GERENTE)
@Controller('audit')
export class AuditController {
  constructor(private readonly queries: AuditQueryService) {}

  @Get()
  @ApiOperation({ summary: 'Lista a trilha de auditoria (paginado, com filtros)' })
  list(@Query() query: AuditQueryDto) {
    return this.queries.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um registro de auditoria (dados antes/depois)' })
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.queries.detail(id);
  }
}
