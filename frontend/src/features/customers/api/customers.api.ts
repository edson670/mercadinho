import { apiClient } from '@/lib/api-client';
import type { PaginatedResponse } from '@/types';

export interface Customer {
  id: string;
  nome: string;
  cpf: string | null;
  telefone: string | null;
  endereco: string | null;
  observacoes: string | null;
  ativo: boolean;
  criadoEm: string;
}

export interface CustomerListParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface CustomerPayload {
  nome: string;
  cpf?: string;
  telefone?: string;
  endereco?: string;
  observacoes?: string;
}

export async function listCustomers(
  params: CustomerListParams,
): Promise<PaginatedResponse<Customer>> {
  const { data } = await apiClient.get('/customers', { params });
  return data;
}

export async function createCustomer(payload: CustomerPayload): Promise<Customer> {
  const { data } = await apiClient.post('/customers', payload);
  return data;
}

export async function updateCustomer(id: string, payload: CustomerPayload): Promise<Customer> {
  const { data } = await apiClient.patch(`/customers/${id}`, payload);
  return data;
}

export async function setCustomerStatus(id: string, ativo: boolean): Promise<Customer> {
  const { data } = await apiClient.patch(`/customers/${id}/status`, { ativo });
  return data;
}
