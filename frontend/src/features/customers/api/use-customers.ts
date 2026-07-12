import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/stores/toast.store';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  createCustomer,
  listCustomers,
  setCustomerStatus,
  updateCustomer,
  type CustomerListParams,
  type CustomerPayload,
} from './customers.api';

const KEY = 'customers';

export function useCustomers(params: CustomerListParams) {
  return useQuery({ queryKey: [KEY, params], queryFn: () => listCustomers(params) });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success('Cliente criado.');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CustomerPayload }) =>
      updateCustomer(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success('Cliente atualizado.');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
}

export function useSetCustomerStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) => setCustomerStatus(id, ativo),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success(c.ativo ? 'Cliente ativado.' : 'Cliente inativado.');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
}
