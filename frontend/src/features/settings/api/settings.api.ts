import { apiClient } from '@/lib/api-client';

export interface CompanySettings {
  id: string;
  nome: string;
  cnpj: string | null;
  endereco: string | null;
  telefone: string | null;
  logoUrl: string | null;
  atualizadoEm: string;
}

export interface UpdateSettingsPayload {
  nome?: string;
  cnpj?: string;
  endereco?: string;
  telefone?: string;
}

export async function getSettings(): Promise<CompanySettings> {
  const { data } = await apiClient.get('/settings');
  return data;
}

export async function updateSettings(payload: UpdateSettingsPayload): Promise<CompanySettings> {
  const { data } = await apiClient.patch('/settings', payload);
  return data;
}

export async function uploadLogo(file: File): Promise<CompanySettings> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post('/settings/logo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
