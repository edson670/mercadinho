import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/stores/toast.store';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  createSupplier,
  listSuppliers,
  setSupplierStatus,
  updateSupplier,
  type SupplierListParams,
  type SupplierPayload,
} from './suppliers.api';

const KEY = 'suppliers';

export function useSuppliers(params: SupplierListParams) {
  return useQuery({ queryKey: [KEY, params], queryFn: () => listSuppliers(params) });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createSupplier,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success('Fornecedor criado.');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SupplierPayload }) =>
      updateSupplier(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success('Fornecedor atualizado.');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
}

export function useSetSupplierStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) => setSupplierStatus(id, ativo),
    onSuccess: (s) => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success(s.ativo ? 'Fornecedor ativado.' : 'Fornecedor inativado.');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
}
