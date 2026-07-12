import { apiClient } from '@/lib/api-client';
import type { PaginatedResponse } from '@/types';

export interface AuditListItem {
  id: string;
  usuarioNome: string | null;
  acao: string;
  entidade: string;
  entidadeId: string | null;
  ip: string | null;
  criadoEm: string;
}

export interface AuditDetail extends AuditListItem {
  dadosAntes: unknown;
  dadosDepois: unknown;
}

export interface AuditListParams {
  page?: number;
  limit?: number;
  entidade?: string;
  from?: string;
  to?: string;
}

export async function listAudit(params: AuditListParams): Promise<PaginatedResponse<AuditListItem>> {
  const { data } = await apiClient.get('/audit', { params });
  return data;
}

export async function getAudit(id: string): Promise<AuditDetail> {
  const { data } = await apiClient.get(`/audit/${id}`);
  return data;
}
