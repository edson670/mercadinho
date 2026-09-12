import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/** Query base para listagens paginadas com busca e ordenação. */
export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({ description: 'Termo de busca livre' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Ordenação no formato campo:asc|desc' })
  @IsOptional()
  @IsString()
  sort?: string;

  get skip(): number {
    return (this.page - 1) * this.limit;
  }

  /**
   * Converte `campo:asc` em objeto orderBy do Prisma.
   *
   * O campo pedido só é aceito se estiver em `permitidos` (o padrão sempre
   * conta como permitido). Qualquer outro nome cai no padrão. Sem essa
   * checagem, o `sort` do cliente ia direto ao Prisma: um nome inexistente
   * derrubava a query com 500 (DoS autenticado) e um nome de coluna real
   * qualquer — inclusive sensível, como `senhaHash` — passava a ordenar a
   * listagem. Ordenar não vaza o valor, mas nada disso deve ser dirigido
   * pela entrada sem uma lista fechada.
   */
  orderBy(
    defaultField = 'criadoEm',
    defaultDir: 'asc' | 'desc' = 'desc',
    permitidos: string[] = [],
  ): Record<string, 'asc' | 'desc'> {
    if (!this.sort) return { [defaultField]: defaultDir };
    const [field, dir] = this.sort.split(':');
    const direcao: 'asc' | 'desc' = dir === 'asc' ? 'asc' : 'desc';
    if (field && (field === defaultField || permitidos.includes(field))) {
      return { [field]: direcao };
    }
    return { [defaultField]: defaultDir };
  }
}
