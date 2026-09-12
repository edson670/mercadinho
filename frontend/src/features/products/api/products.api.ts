import { apiClient } from '@/lib/api-client';
import type { PaginatedResponse } from '@/types';

export type Unidade = 'UN' | 'KG' | 'L' | 'CX' | 'PCT';

export interface Product {
  id: string;
  nome: string;
  descricao: string | null;
  imagemUrl: string | null;
  codigoBarras: string | null;
  categoriaId: string;
  categoriaNome: string;
  precoCompra: number;
  precoVenda: number;
  precoPromocional: number | null;
  estoque: number;
  estoqueMinimo: number;
  unidade: Unidade;
  estoqueBaixo: boolean;
  ativo: boolean;
  criadoEm: string;
}

/**
 * Preço que o cliente realmente paga. Precisa espelhar o cálculo do backend
 * (FinalizarVendaUseCase / CriarPedidoUseCase): se divergir, o total da tela
 * não bate com o total cobrado.
 */
export function precoEfetivo(produto: Pick<Product, 'precoVenda' | 'precoPromocional'>): number {
  const { precoVenda, precoPromocional } = produto;
  return precoPromocional !== null && precoPromocional < precoVenda ? precoPromocional : precoVenda;
}

export interface ProductListParams {
  page?: number;
  limit?: number;
  search?: string;
  categoriaId?: string;
  ativo?: boolean;
}

export interface ProductPayload {
  nome: string;
  codigoBarras?: string;
  categoriaId: string;
  precoCompra: number;
  precoVenda: number;
  estoque?: number;
  estoqueMinimo: number;
  unidade: Unidade;
}

export async function listProducts(params: ProductListParams): Promise<PaginatedResponse<Product>> {
  const { data } = await apiClient.get('/products', { params });
  return data;
}

export async function searchProducts(q: string): Promise<Product[]> {
  const { data } = await apiClient.get('/products/search', { params: { q } });
  return data;
}

/** Busca exata por código de barras (leitor do PDV). `null` se não existir. */
export async function findProductByBarcode(codigo: string): Promise<Product | null> {
  try {
    const { data } = await apiClient.get(`/products/barcode/${encodeURIComponent(codigo)}`);
    return data;
  } catch {
    return null;
  }
}

export async function createProduct(payload: ProductPayload): Promise<Product> {
  const { data } = await apiClient.post('/products', payload);
  return data;
}

export async function updateProduct(
  id: string,
  payload: Partial<Omit<ProductPayload, 'estoque'>>,
): Promise<Product> {
  const { data } = await apiClient.patch(`/products/${id}`, payload);
  return data;
}

export async function setProductStatus(id: string, ativo: boolean): Promise<Product> {
  const { data } = await apiClient.patch(`/products/${id}/status`, { ativo });
  return data;
}

/** Tipos e tamanho aceitos — espelham a validação do backend (PNG/JPEG/WEBP, 2MB). */
export const IMAGEM_TIPOS_ACEITOS = ['image/png', 'image/jpeg', 'image/webp'];
export const IMAGEM_TAMANHO_MAX = 2 * 1024 * 1024;

export async function uploadProductImage(id: string, file: File): Promise<Product> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post(`/products/${id}/image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function deleteProductImage(id: string): Promise<Product> {
  const { data } = await apiClient.delete(`/products/${id}/image`);
  return data;
}
