import { apiClient } from '@/lib/api-client';
import type { PaginatedResponse } from '@/types';
import type { FormaPagamento } from '@/features/sales/api/sales.api';

export type StatusFiado = 'ABERTO' | 'PARCIAL' | 'QUITADO';

export interface Fiado {
  id: string;
  clienteId: string;
  clienteNome: string;
  vendaNumero: number | null;
  valorOriginal: number;
  valorPago: number;
  saldo: number;
  status: StatusFiado;
  criadoEm: string;
}

export interface PaymentItem {
  id: string;
  valor: number;
  formaPagamento: FormaPagamento;
  usuarioNome: string | null;
  data: string;
}

export interface FiadoDetail extends Fiado {
  pagamentos: PaymentItem[];
}

export interface OverdueCustomer {
  clienteId: string;
  clienteNome: string;
  telefone: string | null;
  totalDevido: number;
  quantidadeFiados: number;
}

export interface CreditListParams {
  page?: number;
  limit?: number;
  status?: StatusFiado;
  clienteId?: string;
}

export async function listCredit(params: CreditListParams): Promise<PaginatedResponse<Fiado>> {
  const { data } = await apiClient.get('/credit', { params });
  return data;
}

export async function getCredit(id: string): Promise<FiadoDetail> {
  const { data } = await apiClient.get(`/credit/${id}`);
  return data;
}

export async function listOverdue(): Promise<OverdueCustomer[]> {
  const { data } = await apiClient.get('/credit/overdue');
  return data;
}

export async function registerPayment(
  id: string,
  payload: { valor: number; formaPagamento: FormaPagamento },
): Promise<{ id: string }> {
  const { data } = await apiClient.post(`/credit/${id}/payments`, payload);
  return data;
}
