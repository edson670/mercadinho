import { apiClient } from '@/lib/api-client';
import type { LoginResponse, LoginSuccess } from '@/types';

export interface LoginPayload {
  email: string;
  senha: string;
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', payload);
  return data;
}

export async function mfaVerify(mfaToken: string, codigo: string): Promise<LoginSuccess> {
  const { data } = await apiClient.post('/auth/mfa/verify', { mfaToken, codigo });
  // O endpoint não repete mfaRequired/mfaSetupRecommended — completa aqui para
  // manter o mesmo formato de LoginSuccess usado em toda a aplicação.
  return { ...data, mfaRequired: false, mfaSetupRecommended: false };
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  const { data } = await apiClient.post('/auth/forgot-password', { email });
  return data;
}

export async function resetPassword(token: string, novaSenha: string): Promise<{ message: string }> {
  const { data } = await apiClient.post('/auth/reset-password', { token, novaSenha });
  return data;
}

export interface MfaSetupResponse {
  qrCodeDataUrl: string;
  manualEntryKey: string;
}

export async function mfaSetup(): Promise<MfaSetupResponse> {
  const { data } = await apiClient.post('/auth/mfa/setup');
  return data;
}

export interface MfaEnableResponse {
  message: string;
  recoveryCodes: string[];
}

export async function mfaEnable(codigo: string): Promise<MfaEnableResponse> {
  const { data } = await apiClient.post('/auth/mfa/enable', { codigo });
  return data;
}

export async function mfaDisable(senha: string, codigo: string): Promise<{ message: string }> {
  const { data } = await apiClient.post('/auth/mfa/disable', { senha, codigo });
  return data;
}
