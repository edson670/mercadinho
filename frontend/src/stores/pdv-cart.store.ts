import { create } from 'zustand';
import type { Product } from '@/features/products/api/products.api';

export interface CartItem {
  product: Product;
  quantidade: number;
}

interface PdvCartState {
  items: CartItem[];
  desconto: number;
  addItem: (product: Product) => void;
  setQty: (produtoId: string, quantidade: number) => void;
  removeItem: (produtoId: string) => void;
  setDesconto: (valor: number) => void;
  clear: () => void;
  subtotal: () => number;
  total: () => number;
}

export const usePdvCart = create<PdvCartState>((set, get) => ({
  items: [],
  desconto: 0,

  addItem: (product) =>
    set((state) => {
      const existing = state.items.find((i) => i.product.id === product.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.product.id === product.id ? { ...i, quantidade: i.quantidade + 1 } : i,
          ),
        };
      }
      return { items: [...state.items, { product, quantidade: 1 }] };
    }),

  setQty: (produtoId, quantidade) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.product.id === produtoId ? { ...i, quantidade: Math.max(0.001, quantidade) } : i,
      ),
    })),

  removeItem: (produtoId) =>
    set((state) => ({ items: state.items.filter((i) => i.product.id !== produtoId) })),

  setDesconto: (valor) => set({ desconto: Math.max(0, valor) }),

  clear: () => set({ items: [], desconto: 0 }),

  subtotal: () =>
    get().items.reduce((acc, i) => acc + i.product.precoVenda * i.quantidade, 0),

  total: () => {
    const sub = get().subtotal();
    return Math.max(0, sub - get().desconto);
  },
}));
