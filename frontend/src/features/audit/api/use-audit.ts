import { useQuery } from '@tanstack/react-query';
import { getAudit, listAudit, type AuditListParams } from './audit.api';

const KEY = 'audit';

export function useAuditList(params: AuditListParams) {
  return useQuery({ queryKey: [KEY, params], queryFn: () => listAudit(params) });
}

export function useAuditDetail(id: string | null) {
  return useQuery({ queryKey: [KEY, 'detail', id], queryFn: () => getAudit(id!), enabled: Boolean(id) });
}
