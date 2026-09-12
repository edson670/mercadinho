import { PaginationQueryDto } from './pagination-query.dto';

function comSort(sort?: string): PaginationQueryDto {
  const dto = new PaginationQueryDto();
  if (sort !== undefined) dto.sort = sort;
  return dto;
}

describe('PaginationQueryDto.orderBy', () => {
  it('usa o padrão quando não há sort', () => {
    expect(comSort().orderBy('nome', 'asc', ['nome'])).toEqual({ nome: 'asc' });
  });

  it('aceita um campo que está na allowlist', () => {
    expect(comSort('estoque:desc').orderBy('nome', 'asc', ['nome', 'estoque'])).toEqual({
      estoque: 'desc',
    });
  });

  it('sempre aceita o próprio campo padrão, mesmo fora da allowlist', () => {
    expect(comSort('nome:desc').orderBy('nome', 'asc', [])).toEqual({ nome: 'desc' });
  });

  it('cai no padrão para campo fora da allowlist — não repassa nome arbitrário ao Prisma', () => {
    // Era o vetor de 500 (DoS autenticado): um campo inexistente derrubava a query.
    expect(comSort('naoexiste:asc').orderBy('nome', 'asc', ['nome'])).toEqual({ nome: 'asc' });
  });

  it('cai no padrão ao tentar ordenar por coluna sensível não liberada', () => {
    expect(comSort('senhaHash:desc').orderBy('criadoEm', 'desc', ['nome', 'email'])).toEqual({
      criadoEm: 'desc',
    });
  });

  it('sem allowlist, ignora qualquer sort que não seja o campo padrão', () => {
    expect(comSort('qualquercoisa:asc').orderBy('criadoEm', 'desc')).toEqual({ criadoEm: 'desc' });
  });

  it('normaliza a direção: só "asc" vira asc, o resto é desc', () => {
    expect(comSort('nome:asc').orderBy('nome', 'desc', ['nome'])).toEqual({ nome: 'asc' });
    expect(comSort('nome:lixo').orderBy('nome', 'asc', ['nome'])).toEqual({ nome: 'desc' });
    expect(comSort('nome').orderBy('nome', 'asc', ['nome'])).toEqual({ nome: 'desc' });
  });
});
