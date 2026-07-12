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

  /** Converte `campo:asc` em objeto orderBy do Prisma. */
  orderBy(defaultField = 'criadoEm', defaultDir: 'asc' | 'desc' = 'desc') {
    if (!this.sort) return { [defaultField]: defaultDir };
    const [field, dir] = this.sort.split(':');
    return { [field]: dir === 'asc' ? 'asc' : 'desc' };
  }
}
