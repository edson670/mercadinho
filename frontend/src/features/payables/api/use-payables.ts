import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/stores/toast.store';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  cancelPayable,
  createPayable,
  getPayable,
  getPayableSummary,
  listPayables,
  payPayable,
  updatePayable,
  type CreatePayablePayload,
  type PayableListParams,
  type UpdatePayablePayload,
} from './payables.api';
import type { FormaPagamento } from '@/features/sales/api/sales.api';

const KEY = 'payables';

export function usePayables(params: PayableListParams) {
  return useQuery({ queryKey: [KEY, params], queryFn: () => listPayables(params) });
}

export function usePayableSummary() {
  return useQuery({ queryKey: [KEY, 'summary'], queryFn: getPayableSummary });
}

export function usePayable(id: string | null) {
  return useQuery({
    queryKey: [KEY, 'detail', id],
    queryFn: () => getPayable(id as string),
    enabled: Boolean(id),
  });
}

export function useCreatePayable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePayablePayload) => createPayable(payload),
    onSuccess: ({ ids }) => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success(ids.length > 1 ? `${ids.length} contas mensais criadas.` : 'Conta criada.');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
}

export function useUpdatePayable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdatePayablePayload }) =>
      updatePayable(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success('Conta atualizada.');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
}

export function usePayPayable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      valor,
      formaPagamento,
      observacoes,
    }: {
      id: string;
      valor: number;
      formaPagamento: FormaPagamento;
      observacoes?: string;
    }) => payPayable(id, { valor, formaPagamento, observacoes }),
    onSuccess: ({ status }) => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success(status === 'PAGA' ? 'Conta quitada.' : 'Pagamento parcial registrado.');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
}

export function useCancelPayable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, futuras }: { id: string; futuras?: boolean }) =>
      cancelPayable(id, futuras ?? false),
    onSuccess: ({ canceladas }) => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success(canceladas > 1 ? `${canceladas} contas canceladas.` : 'Conta cancelada.');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
}
