import axios, { AxiosError } from 'axios';
import { useAuthStore } from '@/stores/auth.store';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// Injeta o access token em cada requisição.
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Trata 401: tenta refresh uma vez; se falhar, faz logout.
let refreshing: Promise<string | null> | null = null;

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
    const store = useAuthStore.getState();

    if (error.response?.status === 401 && original && !original._retry && store.refreshToken) {
      original._retry = true;
      try {
        refreshing ??= store.refresh();
        const newToken = await refreshing;
        refreshing = null;
        if (newToken) {
          original.headers = original.headers ?? {};
          original.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(original);
        }
      } catch {
        refreshing = null;
      }
      store.logout();
    }
    return Promise.reject(error);
  },
);

/** Extrai mensagem amigável de erro da API. */
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const msg = error.response?.data?.message;
    if (Array.isArray(msg)) return msg.join(', ');
    if (typeof msg === 'string') return msg;
  }
  return 'Ocorreu um erro inesperado. Tente novamente.';
}
