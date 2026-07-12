import { apiClient } from '@/lib/api-client';
import type { PaginatedResponse } from '@/types';

export interface PurchaseListItem {
  id: string;
  fornecedorNome: string;
  valorTotal: number;
  itensCount: number;
  usuarioNome: string | null;
  data: string;
}

export interface PurchaseDetailItem {
  produtoId: string;
  produtoNome: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
}

export interface PurchaseDetail {
  id: string;
  fornecedorId: string;
  fornecedorNome: string;
  valorTotal: number;
  observacoes: string | null;
  usuarioNome: string | null;
  data: string;
  itens: PurchaseDetailItem[];
}

export interface CreatePurchasePayload {
  fornecedorId: string;
  observacoes?: string;
  itens: { produtoId: string; quantidade: number; precoUnitario: number }[];
}

export interface PurchaseListParams {
  page?: number;
  limit?: number;
  fornecedorId?: string;
}

export async function listPurchases(
  params: PurchaseListParams,
): Promise<PaginatedResponse<PurchaseListItem>> {
  const { data } = await apiClient.get('/purchases', { params });
  return data;
}

export async function getPurchase(id: string): Promise<PurchaseDetail> {
  const { data } = await apiClient.get(`/purchases/${id}`);
  return data;
}

export async function createPurchase(payload: CreatePurchasePayload): Promise<{ id: string }> {
  const { data } = await apiClient.post('/purchases', payload);
  return data;
}
