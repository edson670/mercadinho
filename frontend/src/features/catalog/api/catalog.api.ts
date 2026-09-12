import { apiClient } from '@/lib/api-client';

export type Unidade = 'UN' | 'KG' | 'L' | 'CX' | 'PCT';
export type Disponibilidade = 'DISPONIVEL' | 'ULTIMAS_UNIDADES' | 'ESGOTADO';
export type FormaPagamentoPedido = 'PIX' | 'DINHEIRO' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO';
export type StatusPedido = 'RECEBIDO' | 'EM_SEPARACAO' | 'SAIU_PARA_ENTREGA' | 'ENTREGUE' | 'CANCELADO';

export interface CatalogProduct {
  id: string;
  nome: string;
  descricao: string | null;
  imagemUrl: string | null;
  categoriaId: string;
  categoriaNome: string;
  unidade: Unidade;
  preco: number;
  precoOriginal: number | null;
  emPromocao: boolean;
  disponibilidade: Disponibilidade;
}

export interface CatalogCategory {
  id: string;
  nome: string;
}

interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function listCatalogProducts(params: {
  search?: string;
  categoriaId?: string;
  page?: number;
  limit?: number;
}): Promise<Paginated<CatalogProduct>> {
  const { data } = await apiClient.get('/public/catalog/products', { params });
  return data;
}

export async function listCatalogCategories(): Promise<CatalogCategory[]> {
  const { data } = await apiClient.get('/public/catalog/categories');
  return data;
}

export interface WhatsAppSession {
  telefone: string;
  nome?: string;
}

export async function resolveWhatsAppSession(token: string): Promise<WhatsAppSession> {
  const { data } = await apiClient.get('/public/whatsapp/session', { params: { s: token } });
  return data;
}

export interface OrderItemInput {
  produtoId: string;
  quantidade: number;
}

export interface CreateOrderPayload {
  nome: string;
  telefone: string;
  logradouro: string;
  numeroEndereco: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  referencia?: string;
  formaPagamento: FormaPagamentoPedido;
  trocoPara?: number;
  observacoes?: string;
  idempotencyKey: string;
  /** Código do link do WhatsApp — o backend recusa o pedido sem ele. */
  sessionToken: string;
  itens: OrderItemInput[];
}

export interface CreateOrderResponse {
  id: string;
  numero: number;
  trackingToken: string;
  total: number;
}

export async function createOrder(payload: CreateOrderPayload): Promise<CreateOrderResponse> {
  const { data } = await apiClient.post('/public/orders', payload);
  return data;
}

export interface OrderStatusItem {
  nomeProduto: string;
  quantidade: number;
  subtotal: number;
}

export interface OrderStatusHistoryEntry {
  status: StatusPedido;
  criadoEm: string;
}

export interface OrderStatusResponse {
  numero: number;
  status: StatusPedido;
  total: number;
  formaPagamento: FormaPagamentoPedido;
  criadoEm: string;
  itens: OrderStatusItem[];
  historico: OrderStatusHistoryEntry[];
}

export async function getOrderStatus(trackingToken: string): Promise<OrderStatusResponse> {
  const { data } = await apiClient.get(`/public/orders/${trackingToken}/status`);
  return data;
}
