import { apiClient } from '@/lib/api-client';
import type { PaginatedResponse } from '@/types';

export type FormaPagamento = 'DINHEIRO' | 'PIX' | 'CARTAO' | 'FIADO';
export type StatusVenda = 'CONCLUIDA' | 'CANCELADA';

export interface SaleListItem {
  id: string;
  numero: number;
  clienteNome: string | null;
  usuarioNome: string | null;
  formaPagamento: FormaPagamento;
  status: StatusVenda;
  total: number;
  data: string;
}

export interface SaleItem {
  produtoId: string;
  produtoNome: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
}

export interface SaleDetail extends SaleListItem {
  subtotal: number;
  desconto: number;
  itens: SaleItem[];
}

export interface CreateSalePayload {
  clienteId?: string;
  formaPagamento: FormaPagamento;
  desconto?: number;
  itens: { produtoId: string; quantidade: number }[];
}

export interface SaleListParams {
  page?: number;
  limit?: number;
  formaPagamento?: FormaPagamento;
}

export async function createSale(payload: CreateSalePayload): Promise<{ id: string }> {
  const { data } = await apiClient.post('/sales', payload);
  return data;
}

export async function listSales(params: SaleListParams): Promise<PaginatedResponse<SaleListItem>> {
  const { data } = await apiClient.get('/sales', { params });
  return data;
}

export async function getSale(id: string): Promise<SaleDetail> {
  const { data } = await apiClient.get(`/sales/${id}`);
  return data;
}

export async function cancelSale(id: string): Promise<{ id: string }> {
  const { data } = await apiClient.post(`/sales/${id}/cancel`);
  return data;
}
