import { apiClient } from '@/lib/api-client';
import type { PaginatedResponse } from '@/types';

export interface Supplier {
  id: string;
  nome: string;
  telefone: string | null;
  endereco: string | null;
  observacoes: string | null;
  ativo: boolean;
  criadoEm: string;
}

export interface SupplierListParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface SupplierPayload {
  nome: string;
  telefone?: string;
  endereco?: string;
  observacoes?: string;
}

export async function listSuppliers(
  params: SupplierListParams,
): Promise<PaginatedResponse<Supplier>> {
  const { data } = await apiClient.get('/suppliers', { params });
  return data;
}

export async function createSupplier(payload: SupplierPayload): Promise<Supplier> {
  const { data } = await apiClient.post('/suppliers', payload);
  return data;
}

export async function updateSupplier(id: string, payload: SupplierPayload): Promise<Supplier> {
  const { data } = await apiClient.patch(`/suppliers/${id}`, payload);
  return data;
}

export async function setSupplierStatus(id: string, ativo: boolean): Promise<Supplier> {
  const { data } = await apiClient.patch(`/suppliers/${id}/status`, { ativo });
  return data;
}
