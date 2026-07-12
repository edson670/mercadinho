import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/stores/toast.store';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  createCategory,
  listCategories,
  updateCategory,
  type CategoryListParams,
} from './categories.api';

const KEY = 'categories';

export function useCategories(params: CategoryListParams) {
  return useQuery({ queryKey: [KEY, params], queryFn: () => listCategories(params) });
}

/** Lista completa (para selects). */
export function useAllCategories() {
  return useQuery({
    queryKey: [KEY, 'all'],
    queryFn: () => listCategories({ page: 1, limit: 100 }),
    select: (res) => res.data.filter((c) => c.ativo),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success('Categoria criada.');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { nome?: string; ativo?: boolean } }) =>
      updateCategory(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success('Categoria atualizada.');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
}
