import { apiClient } from '@/lib/api-client';
import type { PaginatedResponse, Role } from '@/types';

export interface User {
  id: string;
  nome: string;
  email: string;
  role: Role;
  ativo: boolean;
  ultimoLogin: string | null;
  criadoEm: string;
}

export interface UserListParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface CreateUserPayload {
  nome: string;
  email: string;
  senha: string;
  role: Role;
}

export type UpdateUserPayload = Partial<Omit<CreateUserPayload, 'senha'>> & { senha?: string };

export async function listUsers(params: UserListParams): Promise<PaginatedResponse<User>> {
  const { data } = await apiClient.get('/users', { params });
  return data;
}

export async function createUser(payload: CreateUserPayload): Promise<User> {
  const { data } = await apiClient.post('/users', payload);
  return data;
}

export async function updateUser(id: string, payload: UpdateUserPayload): Promise<User> {
  const { data } = await apiClient.patch(`/users/${id}`, payload);
  return data;
}

export async function setUserStatus(id: string, ativo: boolean): Promise<User> {
  const { data } = await apiClient.patch(`/users/${id}/status`, { ativo });
  return data;
}
