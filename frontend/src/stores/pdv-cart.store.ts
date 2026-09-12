import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { precoEfetivo, type Product } from '@/features/products/api/products.api';

export interface CartItem {
  product: Product;
  quantidade: number;
}

/**
 * Último item que entrou no carrinho. O `em` existe para o mesmo produto
 * bipado duas vezes seguidas contar como dois eventos — sem ele a lista não
 * reagiria à segunda leitura.
 */
export interface UltimoBipe {
  produtoId: string;
  em: number;
}

interface PdvCartState {
  items: CartItem[];
  desconto: number;
  ultimoBipe: UltimoBipe | null;
  addItem: (product: Product) => void;
  setQty: (produtoId: string, quantidade: number) => void;
  removeItem: (produtoId: string) => void;
  setDesconto: (valor: number) => void;
  clear: () => void;
  subtotal: () => number;
  total: () => number;
}

/**
 * O carrinho é persistido porque um F5 no meio do atendimento apagava a venda
 * inteira e o operador tinha que passar tudo de novo com o cliente esperando.
 * Fica só no navegador daquele caixa; a venda só existe de fato depois de
 * finalizada no servidor.
 */
export const usePdvCart = create<PdvCartState>()(
  persist(
    (set, get) => ({
      items: [],
      desconto: 0,
      ultimoBipe: null,

      addItem: (product) =>
        set((state) => {
          const ultimoBipe = { produtoId: product.id, em: Date.now() };
          const existing = state.items.find((i) => i.product.id === product.id);
          if (existing) {
            return {
              ultimoBipe,
              items: state.items.map((i) =>
                i.product.id === product.id ? { ...i, quantidade: i.quantidade + 1 } : i,
              ),
            };
          }
          return { ultimoBipe, items: [...state.items, { product, quantidade: 1 }] };
        }),

      setQty: (produtoId, quantidade) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.product.id === produtoId ? { ...i, quantidade: Math.max(0.001, quantidade) } : i,
          ),
        })),

      removeItem: (produtoId) =>
        set((state) => ({
          items: state.items.filter((i) => i.product.id !== produtoId),
          // Some o destaque junto com a linha destacada.
          ultimoBipe: state.ultimoBipe?.produtoId === produtoId ? null : state.ultimoBipe,
        })),

      setDesconto: (valor) => set({ desconto: Math.max(0, valor) }),

      clear: () => set({ items: [], desconto: 0, ultimoBipe: null }),

      subtotal: () =>
        get().items.reduce((acc, i) => acc + precoEfetivo(i.product) * i.quantidade, 0),

      total: () => {
        const sub = get().subtotal();
        return Math.max(0, sub - get().desconto);
      },
    }),
    {
      name: 'mercado-pdv-carrinho',
      // O desconto fica de fora de propósito: é uma decisão daquele
      // atendimento, não pode reaparecer silenciosamente na próxima venda.
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
