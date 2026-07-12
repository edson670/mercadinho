import { apiClient } from '@/lib/api-client';
import type { PaginatedResponse } from '@/types';

export interface Category {
  id: string;
  nome: string;
  ativo: boolean;
  criadoEm: string;
}

export interface CategoryListParams {
  page?: number;
  limit?: number;
  search?: string;
}

export async function listCategories(
  params: CategoryListParams,
): Promise<PaginatedResponse<Category>> {
  const { data } = await apiClient.get('/categories', { params });
  return data;
}

export async function createCategory(payload: { nome: string }): Promise<Category> {
  const { data } = await apiClient.post('/categories', payload);
  return data;
}

export async function updateCategory(
  id: string,
  payload: { nome?: string; ativo?: boolean },
): Promise<Category> {
  const { data } = await apiClient.patch(`/categories/${id}`, payload);
  return data;
}
