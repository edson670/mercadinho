import { apiClient } from '@/lib/api-client';
import type { PaginatedResponse } from '@/types';
import type { FormaPagamento } from '@/features/sales/api/sales.api';

export type StatusContaPagar = 'ABERTA' | 'PARCIAL' | 'PAGA' | 'CANCELADA';

export type CategoriaDespesa =
  | 'FORNECEDOR'
  | 'ALUGUEL'
  | 'ENERGIA'
  | 'AGUA'
  | 'INTERNET_TELEFONE'
  | 'SALARIOS'
  | 'IMPOSTOS'
  | 'MANUTENCAO'
  | 'TRANSPORTE'
  | 'OUTROS';

export const CATEGORIA_LABEL: Record<CategoriaDespesa, string> = {
  FORNECEDOR: 'Fornecedor',
  ALUGUEL: 'Aluguel',
  ENERGIA: 'Energia',
  AGUA: 'Água',
  INTERNET_TELEFONE: 'Internet / telefone',
  SALARIOS: 'Salários',
  IMPOSTOS: 'Impostos',
  MANUTENCAO: 'Manutenção',
  TRANSPORTE: 'Transporte',
  OUTROS: 'Outros',
};

export const CATEGORIAS = Object.keys(CATEGORIA_LABEL) as CategoriaDespesa[];

export interface Payable {
  id: string;
  descricao: string;
  categoria: CategoriaDespesa;
  fornecedorId: string | null;
  fornecedorNome: string | null;
  valorOriginal: number;
  valorPago: number;
  saldo: number;
  status: StatusContaPagar;
  vencimento: string;
  diasParaVencer: number | null;
  vencida: boolean;
  observacoes: string | null;
  criadoEm: string;
}

export interface PayablePayment {
  id: string;
  valor: number;
  formaPagamento: FormaPagamento;
  observacoes: string | null;
  usuarioNome: string | null;
  data: string;
}

export interface PayableDetail extends Payable {
  grupoRecorrencia: string | null;
  criadoPorNome: string | null;
  pagamentos: PayablePayment[];
}

export interface PayableCategoryTotal {
  categoria: CategoriaDespesa;
  total: number;
  quantidade: number;
}

export interface PayableSummary {
  totalEmAberto: number;
  totalVencido: number;
  quantidadeVencidas: number;
  totalAVencer7Dias: number;
  quantidadeAVencer7Dias: number;
  pagoNoMes: number;
  porCategoria: PayableCategoryTotal[];
}

export interface PayableListParams {
  page?: number;
  limit?: number;
  status?: StatusContaPagar;
  categoria?: CategoriaDespesa;
  fornecedorId?: string;
  search?: string;
  vencimentoDe?: string;
  vencimentoAte?: string;
  vencidas?: boolean;
}

export interface CreatePayablePayload {
  descricao: string;
  categoria?: CategoriaDespesa;
  fornecedorId?: string;
  valor: number;
  vencimento: string;
  observacoes?: string;
  repetirMeses?: number;
}

export type UpdatePayablePayload = Partial<Omit<CreatePayablePayload, 'repetirMeses'>>;

export async function listPayables(params: PayableListParams): Promise<PaginatedResponse<Payable>> {
  const { data } = await apiClient.get('/payables', { params });
  return data;
}

export async function getPayableSummary(): Promise<PayableSummary> {
  const { data } = await apiClient.get('/payables/summary');
  return data;
}

export async function getPayable(id: string): Promise<PayableDetail> {
  const { data } = await apiClient.get(`/payables/${id}`);
  return data;
}

export async function createPayable(payload: CreatePayablePayload): Promise<{ ids: string[] }> {
  const { data } = await apiClient.post('/payables', payload);
  return data;
}

export async function updatePayable(
  id: string,
  payload: UpdatePayablePayload,
): Promise<{ id: string }> {
  const { data } = await apiClient.patch(`/payables/${id}`, payload);
  return data;
}

export async function payPayable(
  id: string,
  payload: { valor: number; formaPagamento: FormaPagamento; observacoes?: string },
): Promise<{ id: string; saldo: number; status: StatusContaPagar }> {
  const { data } = await apiClient.post(`/payables/${id}/payments`, payload);
  return data;
}

export async function cancelPayable(id: string, futuras = false): Promise<{ canceladas: number }> {
  const { data } = await apiClient.post(`/payables/${id}/cancel`, null, { params: { futuras } });
  return data;
}
