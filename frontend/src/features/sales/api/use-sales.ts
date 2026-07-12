import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/stores/toast.store';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  cancelSale,
  createSale,
  getSale,
  listSales,
  type SaleListParams,
} from './sales.api';

const KEY = 'sales';

export function useSales(params: SaleListParams) {
  return useQuery({ queryKey: [KEY, params], queryFn: () => listSales(params) });
}

export function useSale(id: string | null) {
  return useQuery({ queryKey: [KEY, 'detail', id], queryFn: () => getSale(id!), enabled: Boolean(id) });
}

export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createSale,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['stock'] });
      qc.invalidateQueries({ queryKey: ['cash-register'] });
      qc.invalidateQueries({ queryKey: ['credit'] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
}

export function useCancelSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cancelSale,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['stock'] });
      toast.success('Venda cancelada e estoque estornado.');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
}
