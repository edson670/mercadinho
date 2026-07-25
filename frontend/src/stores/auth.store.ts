import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import axios from 'axios';
import type { AuthUser } from '@/types';

interface AuthState {
  user: AuthUser | null;
  /** Só em memória — some ao recarregar a página e é reobtido via refresh(). */
  accessToken: string | null;
  isAuthenticated: boolean;
  /** Falso até a tentativa de restaurar a sessão terminar (evita piscar o login). */
  sessionReady: boolean;
  setSession: (payload: { user: AuthUser; accessToken: string }) => void;
  /** Atualiza campos do perfil sem precisar de um novo login (ex.: mfaEnabled). */
  patchUser: (patch: Partial<AuthUser>) => void;
  refresh: () => Promise<string | null>;
  restoreSession: () => Promise<void>;
  logout: () => Promise<void>;
}

const API_URL = import.meta.env.VITE_API_URL ?? '/api/v1';

/**
 * Fora do store de propósito: precisa ser compartilhado por qualquer chamador
 * de `refresh()` (o boot em App.tsx e o interceptor 401 do api-client são dois
 * chamadores independentes). Sem isso, duas chamadas simultâneas — o caso mais
 * comum é o StrictMode do React invocando o efeito de boot duas vezes em dev —
 * disputam a rotação do mesmo refresh token; como a rotação no backend não é
 * atômica, uma das duas perde a corrida e a store interpretava isso como
 * "sessão inválida", derrubando um login que era válido.
 */
let refreshInFlight: Promise<string | null> | null = null;

/**
 * O refresh token não passa mais pelo JavaScript: fica num cookie HttpOnly que
 * o navegador envia sozinho (`withCredentials`). Por isso o access token pode
 * viver só em memória — um XSS não encontra nada persistido para roubar.
 * `partialize` garante que nem o access token nem flags derivadas vão para o
 * localStorage; só o perfil do usuário, para não piscar a tela ao recarregar.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      sessionReady: false,

      setSession: ({ user, accessToken }) =>
        set({ user, accessToken, isAuthenticated: true, sessionReady: true }),

      patchUser: (patch) => {
        const current = get().user;
        if (current) set({ user: { ...current, ...patch } });
      },

      refresh: () => {
        if (refreshInFlight) return refreshInFlight;

        refreshInFlight = (async () => {
          try {
            const { data } = await axios.post(
              `${API_URL}/auth/refresh`,
              {},
              { withCredentials: true },
            );
            set({ accessToken: data.accessToken, isAuthenticated: true });
            return data.accessToken as string;
          } catch {
            set({ user: null, accessToken: null, isAuthenticated: false });
            return null;
          } finally {
            refreshInFlight = null;
          }
        })();

        return refreshInFlight;
      },

      restoreSession: async () => {
        // Sem usuário lembrado não há sessão a restaurar — evita um POST
        // /auth/refresh inútil em toda visita de quem nunca entrou.
        if (!get().user) {
          set({ sessionReady: true });
          return;
        }
        await get().refresh();
        set({ sessionReady: true });
      },

      logout: async () => {
        // Precisa chegar ao servidor: só ele consegue revogar o refresh token
        // e apagar o cookie HttpOnly.
        try {
          await axios.post(`${API_URL}/auth/logout`, {}, { withCredentials: true });
        } catch {
          /* logout local acontece de qualquer forma */
        }
        set({ user: null, accessToken: null, isAuthenticated: false, sessionReady: true });
      },
    }),
    {
      name: 'mercado-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
