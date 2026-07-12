import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/stores/toast.store';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  getCredit,
  listCredit,
  listOverdue,
  registerPayment,
  type CreditListParams,
} from './credit.api';
import type { FormaPagamento } from '@/features/sales/api/sales.api';

const KEY = 'credit';

export function useCreditList(params: CreditListParams) {
  return useQuery({ queryKey: [KEY, params], queryFn: () => listCredit(params) });
}

export function useCredit(id: string | null) {
  return useQuery({ queryKey: [KEY, 'detail', id], queryFn: () => getCredit(id!), enabled: Boolean(id) });
}

export function useOverdue() {
  return useQuery({ queryKey: [KEY, 'overdue'], queryFn: listOverdue });
}

export function useRegisterPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      valor,
      formaPagamento,
    }: {
      id: string;
      valor: number;
      formaPagamento: FormaPagamento;
    }) => registerPayment(id, { valor, formaPagamento }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success('Pagamento registrado.');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
}
