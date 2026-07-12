import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/stores/toast.store';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  getSettings,
  updateSettings,
  uploadLogo,
  type UpdateSettingsPayload,
} from './settings.api';

const KEY = 'settings';

export function useSettings() {
  return useQuery({ queryKey: [KEY], queryFn: getSettings });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateSettingsPayload) => updateSettings(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success('Configurações atualizadas.');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
}

export function useUploadLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadLogo(file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success('Logotipo atualizado.');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
}
