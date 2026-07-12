import { ApiProperty } from '@nestjs/swagger';

/** Envelope padrão para respostas paginadas. */
export class PaginatedResponseDto<T> {
  @ApiProperty({ isArray: true })
  data: T[];

  @ApiProperty({ example: 120 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 6 })
  totalPages: number;

  constructor(data: T[], total: number, page: number, limit: number) {
    this.data = data;
    this.total = total;
    this.page = page;
    this.limit = limit;
    this.totalPages = Math.ceil(total / limit) || 1;
  }
}

/** Helper para montar o envelope a partir de um resultado de contagem+dados. */
export function paginate<T>(
  data: T[],
  total: number,
  query: { page: number; limit: number },
): PaginatedResponseDto<T> {
  return new PaginatedResponseDto(data, total, query.page, query.limit);
}
