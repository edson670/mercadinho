import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/stores/toast.store';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  createPurchase,
  getPurchase,
  listPurchases,
  type PurchaseListParams,
} from './purchases.api';

const KEY = 'purchases';

export function usePurchases(params: PurchaseListParams) {
  return useQuery({ queryKey: [KEY, params], queryFn: () => listPurchases(params) });
}

export function usePurchase(id: string | null) {
  return useQuery({
    queryKey: [KEY, 'detail', id],
    queryFn: () => getPurchase(id!),
    enabled: Boolean(id),
  });
}

export function useCreatePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createPurchase,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['stock'] });
      toast.success('Compra registrada e estoque atualizado.');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
}
