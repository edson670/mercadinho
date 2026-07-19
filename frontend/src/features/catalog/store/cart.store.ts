import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CatalogProduct } from '../api/catalog.api';

export interface CartItem {
  produtoId: string;
  nome: string;
  preco: number;
  imagemUrl: string | null;
  unidade: string;
  quantidade: number;
}

interface CartState {
  items: CartItem[];
  add: (produto: CatalogProduct) => void;
  increment: (produtoId: string) => void;
  decrement: (produtoId: string) => void;
  remove: (produtoId: string) => void;
  clear: () => void;
  total: () => number;
  count: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (produto) =>
        set((state) => {
          const existing = state.items.find((i) => i.produtoId === produto.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.produtoId === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i,
              ),
            };
          }
          return {
            items: [
              ...state.items,
              {
                produtoId: produto.id,
                nome: produto.nome,
                preco: produto.preco,
                imagemUrl: produto.imagemUrl,
                unidade: produto.unidade,
                quantidade: 1,
              },
            ],
          };
        }),
      increment: (produtoId) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.produtoId === produtoId ? { ...i, quantidade: i.quantidade + 1 } : i,
          ),
        })),
      decrement: (produtoId) =>
        set((state) => ({
          items: state.items
            .map((i) => (i.produtoId === produtoId ? { ...i, quantidade: i.quantidade - 1 } : i))
            .filter((i) => i.quantidade > 0),
        })),
      remove: (produtoId) =>
        set((state) => ({ items: state.items.filter((i) => i.produtoId !== produtoId) })),
      clear: () => set({ items: [] }),
      total: () => get().items.reduce((sum, i) => sum + i.preco * i.quantidade, 0),
      count: () => get().items.reduce((sum, i) => sum + i.quantidade, 0),
    }),
    { name: 'mercado-catalogo-carrinho' },
  ),
);
