import { apiClient } from '@/lib/api-client';
import type { LoginResponse } from '@/types';

export interface LoginPayload {
  email: string;
  senha: string;
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', payload);
  return data;
}

export async function logout(refreshToken: string): Promise<void> {
  await apiClient.post('/auth/logout', { refreshToken });
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  const { data } = await apiClient.post('/auth/forgot-password', { email });
  return data;
}

export async function resetPassword(token: string, novaSenha: string): Promise<{ message: string }> {
  const { data } = await apiClient.post('/auth/reset-password', { token, novaSenha });
  return data;
}
