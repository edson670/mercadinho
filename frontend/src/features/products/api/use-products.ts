import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/stores/toast.store';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  createProduct,
  listProducts,
  setProductStatus,
  updateProduct,
  type ProductListParams,
  type ProductPayload,
} from './products.api';

const KEY = 'products';

export function useProducts(params: ProductListParams) {
  return useQuery({ queryKey: [KEY, params], queryFn: () => listProducts(params) });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success('Produto criado.');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Omit<ProductPayload, 'estoque'>> }) =>
      updateProduct(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success('Produto atualizado.');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
}

export function useSetProductStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) => setProductStatus(id, ativo),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success(p.ativo ? 'Produto ativado.' : 'Produto inativado.');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
}
