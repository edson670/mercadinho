import { apiClient } from '@/lib/api-client';
import type { PaginatedResponse } from '@/types';

export type StatusCaixa = 'ABERTO' | 'FECHADO';
export type TipoMovimentacaoCaixa = 'SANGRIA' | 'SUPRIMENTO';

export interface CashTotals {
  totalVendas: number;
  vendasDinheiro: number;
  totalSangrias: number;
  totalSuprimentos: number;
  saldoEsperado: number;
}

export interface CashMovementItem {
  id: string;
  tipo: TipoMovimentacaoCaixa;
  valor: number;
  motivo: string | null;
  criadoEm: string;
}

export interface CashRegister {
  id: string;
  status: StatusCaixa;
  usuarioNome: string | null;
  valorAbertura: number;
  valorFechamento: number | null;
  abertoEm: string;
  fechadoEm: string | null;
  totais: CashTotals;
  diferenca: number | null;
  movimentacoes: CashMovementItem[];
}

export interface CashHistoryItem {
  id: string;
  status: StatusCaixa;
  usuarioNome: string | null;
  valorAbertura: number;
  valorFechamento: number | null;
  totalVendas: number | null;
  abertoEm: string;
  fechadoEm: string | null;
}

export async function getCurrentCash(): Promise<CashRegister | null> {
  const { data } = await apiClient.get('/cash-register/current');
  return data;
}

export async function openCash(valorAbertura: number): Promise<CashRegister> {
  const { data } = await apiClient.post('/cash-register/open', { valorAbertura });
  return data;
}

export async function addCashMovement(
  id: string,
  payload: { tipo: TipoMovimentacaoCaixa; valor: number; motivo: string },
): Promise<CashRegister> {
  const { data } = await apiClient.post(`/cash-register/${id}/movements`, payload);
  return data;
}

export async function closeCash(
  id: string,
  payload: { valorFechamento?: number; observacoes?: string },
): Promise<CashRegister> {
  const { data } = await apiClient.post(`/cash-register/${id}/close`, payload);
  return data;
}

export async function listCashHistory(params: {
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<CashHistoryItem>> {
  const { data } = await apiClient.get('/cash-register', { params });
  return data;
}
