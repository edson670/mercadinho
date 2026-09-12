/**
 * `vencimento` é uma data pura (coluna `date`) e chega como
 * `2026-10-05T00:00:00.000Z`. Formatar com `formatDate` usaria o fuso local
 * e mostraria 04/10 em UTC-3 — todo vencimento apareceria um dia antes.
 * Aqui tudo é lido em UTC.
 */

export function formatVencimento(iso: string): string {
  const d = new Date(iso);
  const dia = String(d.getUTCDate()).padStart(2, '0');
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${d.getUTCFullYear()}`;
}

/** `2026-10-05T00:00:00.000Z` → `2026-10-05`, para `<input type="date">`. */
export function paraInputDate(iso: string): string {
  return iso.slice(0, 10);
}

/** Hoje em `YYYY-MM-DD`, no fuso de quem está olhando a tela. */
export function hojeInputDate(): string {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

/** Texto curto do prazo, para a coluna de vencimento. */
export function rotuloPrazo(dias: number | null): string | null {
  if (dias === null) return null;
  if (dias < -1) return `${Math.abs(dias)} dias em atraso`;
  if (dias === -1) return 'venceu ontem';
  if (dias === 0) return 'vence hoje';
  if (dias === 1) return 'vence amanhã';
  return `em ${dias} dias`;
}
