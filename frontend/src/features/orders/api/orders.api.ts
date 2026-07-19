import { apiClient } from '@/lib/api-client';
import type { PaginatedResponse } from '@/types';

export type StatusPedido = 'RECEBIDO' | 'EM_SEPARACAO' | 'SAIU_PARA_ENTREGA' | 'ENTREGUE' | 'CANCELADO';

/** Forma de pagamento específica de pedidos (diferente da de vendas do PDV — sem FIADO). */
export type FormaPagamentoPedido = 'PIX' | 'DINHEIRO' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO';

export interface OrderListItem {
  id: string;
  numero: number;
  nomeCliente: string;
  telefone: string;
  bairro: string;
  formaPagamento: FormaPagamentoPedido;
  status: StatusPedido;
  total: number;
  itensCount: number;
  criadoEm: string;
}

export interface OrderAddress {
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  referencia: string | null;
}

export interface OrderItem {
  produtoId: string;
  nomeProduto: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
}

export interface OrderHistoryEntry {
  status: StatusPedido;
  usuarioNome: string | null;
  criadoEm: string;
}

export interface OrderDetail {
  id: string;
  numero: number;
  nomeCliente: string;
  telefone: string;
  endereco: OrderAddress;
  formaPagamento: FormaPagamentoPedido;
  trocoPara: number | null;
  subtotal: number;
  total: number;
  status: StatusPedido;
  observacoes: string | null;
  criadoEm: string;
  itens: OrderItem[];
  historico: OrderHistoryEntry[];
}

export interface OrderListParams {
  page?: number;
  limit?: number;
  status?: StatusPedido;
  search?: string;
}

export async function listOrders(params: OrderListParams): Promise<PaginatedResponse<OrderListItem>> {
  const { data } = await apiClient.get('/orders', { params });
  return data;
}

export async function getOrder(id: string): Promise<OrderDetail> {
  const { data } = await apiClient.get(`/orders/${id}`);
  return data;
}

export async function updateOrderStatus(id: string, status: StatusPedido): Promise<OrderDetail> {
  const { data } = await apiClient.patch(`/orders/${id}/status`, { status });
  return data;
}

export async function cancelOrder(id: string): Promise<OrderDetail> {
  const { data } = await apiClient.post(`/orders/${id}/cancel`);
  return data;
}
