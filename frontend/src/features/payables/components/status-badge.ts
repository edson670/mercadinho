import type { StatusContaPagar } from '../api/payables.api';

type Variante = 'success' | 'warning' | 'destructive' | 'outline';

/** Uma definição só, usada na lista e no detalhe. */
export const STATUS_BADGE: Record<StatusContaPagar, { label: string; variant: Variante }> = {
  ABERTA: { label: 'Aberta', variant: 'warning' },
  PARCIAL: { label: 'Parcial', variant: 'warning' },
  PAGA: { label: 'Paga', variant: 'success' },
  // Cancelada é ausência de dívida, não problema: cinza, não vermelho.
  CANCELADA: { label: 'Cancelada', variant: 'outline' },
};
