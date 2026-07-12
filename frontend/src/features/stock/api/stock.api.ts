import { apiClient } from '@/lib/api-client';
import type { PaginatedResponse } from '@/types';

export type TipoMovimentacao = 'ENTRADA' | 'SAIDA' | 'AJUSTE';
export type OrigemMovimentacao = 'VENDA' | 'COMPRA' | 'AJUSTE_MANUAL' | 'CANCELAMENTO';

export interface Movement {
  id: string;
  produtoId: string;
  produtoNome: string;
  tipo: TipoMovimentacao;
  origem: OrigemMovimentacao;
  quantidade: number;
  estoqueAnterior: number;
  estoqueResultante: number;
  motivo: string | null;
  usuarioNome: string | null;
  criadoEm: string;
}

export interface LowStockItem {
  id: string;
  nome: string;
  categoriaNome: string;
  estoque: number;
  estoqueMinimo: number;
  unidade: string;
}

export interface MovementParams {
  page?: number;
  limit?: number;
  produtoId?: string;
  tipo?: TipoMovimentacao;
}

export async function listMovements(params: MovementParams): Promise<PaginatedResponse<Movement>> {
  const { data } = await apiClient.get('/stock/movements', { params });
  return data;
}

export async function listLowStock(): Promise<LowStockItem[]> {
  const { data } = await apiClient.get('/stock/low');
  return data;
}

export async function stockEntry(payload: {
  produtoId: string;
  quantidade: number;
  motivo?: string;
}): Promise<Movement> {
  const { data } = await apiClient.post('/stock/entries', payload);
  return data;
}

export async function stockAdjustment(payload: {
  produtoId: string;
  novaQuantidade: number;
  motivo: string;
}): Promise<Movement> {
  const { data } = await apiClient.post('/stock/adjustments', payload);
  return data;
}
