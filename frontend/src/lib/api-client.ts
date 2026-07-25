import axios, { AxiosError } from 'axios';
import { useAuthStore } from '@/stores/auth.store';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  // Necessário para o cookie HttpOnly do refresh token acompanhar as chamadas
  // de /auth (o backend responde com CORS credentials + origens explícitas).
  withCredentials: true,
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
apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
    const store = useAuthStore.getState();

    // Sem `store.refreshToken` para checar (ele não existe mais no cliente —
    // vive só no cookie HttpOnly): tenta o refresh sempre que houver usuário
    // logado, e deixa o próprio endpoint dizer se o cookie é válido.
    //
    // `store.refresh()` já deduplica chamadas concorrentes internamente (ver
    // auth.store.ts) — não precisa de um guard próprio aqui: se o boot da
    // aplicação já estiver renovando a sessão, esta chamada só reaproveita a
    // mesma promise em andamento.
    if (error.response?.status === 401 && original && !original._retry && store.user) {
      original._retry = true;
      const newToken = await store.refresh();
      if (newToken) {
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      }
      await store.logout();
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
