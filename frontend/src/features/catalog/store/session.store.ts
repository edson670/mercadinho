import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CatalogSessionState {
  telefone: string | null;
  nome: string | null;
  set: (data: { telefone: string; nome?: string }) => void;
}

/** Prefill de nome/telefone resolvido a partir do link enviado pelo WhatsApp (`?s=token`). */
export const useCatalogSessionStore = create<CatalogSessionState>()(
  persist(
    (set) => ({
      telefone: null,
      nome: null,
      set: ({ telefone, nome }) => set({ telefone, nome: nome ?? null }),
    }),
    { name: 'mercado-catalogo-sessao' },
  ),
);
