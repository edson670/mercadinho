import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/stores/toast.store';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  listLowStock,
  listMovements,
  stockAdjustment,
  stockEntry,
  type MovementParams,
} from './stock.api';

const KEY = 'stock';

export function useMovements(params: MovementParams) {
  return useQuery({ queryKey: [KEY, 'movements', params], queryFn: () => listMovements(params) });
}

export function useLowStock() {
  return useQuery({ queryKey: [KEY, 'low'], queryFn: listLowStock });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: [KEY] });
  qc.invalidateQueries({ queryKey: ['products'] });
}

export function useStockEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: stockEntry,
    onSuccess: () => {
      invalidateAll(qc);
      toast.success('Entrada de estoque registrada.');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
}

export function useStockAdjustment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: stockAdjustment,
    onSuccess: () => {
      invalidateAll(qc);
      toast.success('Ajuste de estoque registrado.');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
}
