/**
 * A coluna `vencimento` é `@db.Date` — só a data importa. Todo cálculo aqui
 * é feito em UTC de propósito: construir a data no fuso local faz o dia
 * "andar" para trás em UTC-3 (05/10 local vira 04/10 gravado).
 */

/** 'YYYY-MM-DD' (ou ISO completo) → meia-noite UTC daquele dia. */
export function paraDataVencimento(iso: string): Date {
  const [ano, mes, dia] = iso.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia));
}

/** Hoje, zerado, para comparar com vencimentos sem sofrer com o horário. */
export function hojeUtc(): Date {
  const agora = new Date();
  return new Date(Date.UTC(agora.getFullYear(), agora.getMonth(), agora.getDate()));
}

/**
 * Soma meses grudando no último dia quando o dia não existe no mês alvo:
 * um aluguel que vence dia 31 cai em 28/02, não em 03/03.
 */
export function somarMeses(base: Date, meses: number): Date {
  const dia = base.getUTCDate();
  const alvo = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + meses, 1));
  const ultimoDiaDoMes = new Date(
    Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return new Date(
    Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth(), Math.min(dia, ultimoDiaDoMes)),
  );
}

/** Dias inteiros entre hoje e o vencimento; negativo quando já passou. */
export function diasAteVencer(vencimento: Date, hoje = hojeUtc()): number {
  const dia = 24 * 60 * 60 * 1000;
  const alvo = Date.UTC(
    vencimento.getUTCFullYear(),
    vencimento.getUTCMonth(),
    vencimento.getUTCDate(),
  );
  return Math.round((alvo - hoje.getTime()) / dia);
}
