import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/stores/toast.store';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  addCashMovement,
  closeCash,
  getCurrentCash,
  listCashHistory,
  openCash,
  type TipoMovimentacaoCaixa,
} from './cash-register.api';

const KEY = 'cash-register';

export function useCurrentCash() {
  return useQuery({ queryKey: [KEY, 'current'], queryFn: getCurrentCash });
}

export function useCashHistory(params: { page?: number; limit?: number }) {
  return useQuery({ queryKey: [KEY, 'history', params], queryFn: () => listCashHistory(params) });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: [KEY] });
}

export function useOpenCash() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (valorAbertura: number) => openCash(valorAbertura),
    onSuccess: () => {
      invalidate(qc);
      toast.success('Caixa aberto.');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
}

export function useCashMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      tipo,
      valor,
      motivo,
    }: {
      id: string;
      tipo: TipoMovimentacaoCaixa;
      valor: number;
      motivo: string;
    }) => addCashMovement(id, { tipo, valor, motivo }),
    onSuccess: (_d, v) => {
      invalidate(qc);
      toast.success(v.tipo === 'SANGRIA' ? 'Sangria registrada.' : 'Suprimento registrado.');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
}

export function useCloseCash() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      valorFechamento,
      observacoes,
    }: {
      id: string;
      valorFechamento?: number;
      observacoes?: string;
    }) => closeCash(id, { valorFechamento, observacoes }),
    onSuccess: () => {
      invalidate(qc);
      toast.success('Caixa fechado.');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
}
