import { apiClient } from '@/lib/api-client';
import type { FormaPagamento } from '@/features/sales/api/sales.api';

export interface DashboardSummary {
  vendasDia: number;
  qtdVendasDia: number;
  vendasMes: number;
  qtdVendasMes: number;
  totalFaturado: number;
  fiadoEmAberto: number;
  totalRecebidoFiado: number;
  clientesInadimplentes: number;
  produtosEstoqueBaixo: number;
  ultimasVendas: {
    id: string;
    numero: number;
    clienteNome: string | null;
    total: number;
    formaPagamento: FormaPagamento;
    data: string;
  }[];
}

export interface SalesChartPoint {
  label: string;
  total: number;
}

export interface TopProduct {
  produtoId: string;
  produtoNome: string;
  quantidade: number;
  total: number;
}

export type ChartPeriod = '7d' | '30d' | '12m';

export async function getSummary(): Promise<DashboardSummary> {
  const { data } = await apiClient.get('/dashboard/summary');
  return data;
}

export async function getSalesChart(period: ChartPeriod): Promise<SalesChartPoint[]> {
  const { data } = await apiClient.get('/dashboard/sales-chart', { params: { period } });
  return data;
}

export async function getTopProducts(): Promise<TopProduct[]> {
  const { data } = await apiClient.get('/dashboard/top-products');
  return data;
}
