import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CatalogSessionState {
  /** Código do link (`?s=`). Vai junto do pedido — é o que autoriza a criação. */
  token: string | null;
  telefone: string | null;
  nome: string | null;
  set: (data: { token: string; telefone: string; nome?: string }) => void;
  clear: () => void;
}

/**
 * Sessão resolvida a partir do link enviado pelo WhatsApp (`?s=token`).
 * Guarda o token além do prefill porque o backend exige a sessão para aceitar
 * o pedido — sem ele o endereço público aceitaria pedido anônimo.
 */
export const useCatalogSessionStore = create<CatalogSessionState>()(
  persist(
    (set) => ({
      token: null,
      telefone: null,
      nome: null,
      set: ({ token, telefone, nome }) => set({ token, telefone, nome: nome ?? null }),
      clear: () => set({ token: null, telefone: null, nome: null }),
    }),
    { name: 'mercado-catalogo-sessao' },
  ),
);
