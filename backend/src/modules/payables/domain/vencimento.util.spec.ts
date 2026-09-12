import { diasAteVencer, paraDataVencimento, somarMeses } from './vencimento.util';

describe('paraDataVencimento', () => {
  it('grava o dia informado, sem deslocar por fuso', () => {
    const d = paraDataVencimento('2026-10-05');

    expect(d.toISOString()).toBe('2026-10-05T00:00:00.000Z');
    expect(d.getUTCDate()).toBe(5);
  });

  it('aceita ISO completo e descarta a hora', () => {
    expect(paraDataVencimento('2026-10-05T23:40:00.000Z').toISOString()).toBe(
      '2026-10-05T00:00:00.000Z',
    );
  });
});

describe('somarMeses', () => {
  it('mantém o dia quando ele existe no mês alvo', () => {
    expect(somarMeses(paraDataVencimento('2026-01-15'), 2).toISOString()).toBe(
      '2026-03-15T00:00:00.000Z',
    );
  });

  it('gruda no último dia quando o dia não existe — dia 31 não vira março', () => {
    // Um aluguel que vence dia 31 precisa cair em 28/02, não em 03/03.
    expect(somarMeses(paraDataVencimento('2026-01-31'), 1).toISOString()).toBe(
      '2026-02-28T00:00:00.000Z',
    );
    expect(somarMeses(paraDataVencimento('2026-01-31'), 3).toISOString()).toBe(
      '2026-04-30T00:00:00.000Z',
    );
  });

  it('atravessa a virada de ano', () => {
    expect(somarMeses(paraDataVencimento('2026-11-10'), 3).toISOString()).toBe(
      '2027-02-10T00:00:00.000Z',
    );
  });

  it('não acumula erro ao gerar uma série de 12 parcelas a partir do dia 31', () => {
    const base = paraDataVencimento('2026-01-31');
    const dias = Array.from({ length: 12 }, (_, i) => somarMeses(base, i).getUTCDate());

    // Cada parcela parte sempre da base, então fevereiro encolhe mas março
    // volta para 31 — o erro não se propaga.
    expect(dias).toEqual([31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]);
  });
});

describe('diasAteVencer', () => {
  const hoje = paraDataVencimento('2026-09-12');

  it('conta positivo para o futuro e negativo para o passado', () => {
    expect(diasAteVencer(paraDataVencimento('2026-09-19'), hoje)).toBe(7);
    expect(diasAteVencer(paraDataVencimento('2026-09-10'), hoje)).toBe(-2);
  });

  it('devolve zero no próprio dia do vencimento', () => {
    expect(diasAteVencer(paraDataVencimento('2026-09-12'), hoje)).toBe(0);
  });

  it('não erra na virada do horário de verão', () => {
    // Fevereiro→outubro cruzaria mudanças de offset se a conta fosse local.
    expect(diasAteVencer(paraDataVencimento('2026-10-18'), paraDataVencimento('2026-02-01'))).toBe(
      259,
    );
  });
});
