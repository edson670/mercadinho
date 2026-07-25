import { useState } from 'react';
import { ImageOff, Minus, Plus, TriangleAlert } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn, formatCurrency } from '@/lib/utils';
import { usePdvCart } from '@/stores/pdv-cart.store';
import type { Product } from '../../products/api/products.api';

const UNIDADE_LABEL: Record<string, string> = {
  UN: 'un.',
  KG: 'kg',
  L: 'litro',
  CX: 'caixa',
  PCT: 'pacote',
};

/**
 * Cartão de produto em formato de grade (estilo Square/iFood) — substitui a
 * antiga busca-e-limpa por um toque direto no produto. O preço mostrado é
 * sempre `precoVenda`: não exibimos preço promocional aqui porque a venda do
 * PDV ainda cobra por `precoVenda` (o cálculo promocional é exclusivo do
 * catálogo do cliente) — mostrar um risco de desconto que não é aplicado no
 * caixa confundiria o operador.
 */
export function ProductGridCard({ produto }: { produto: Product }) {
  const item = usePdvCart((s) => s.items.find((i) => i.product.id === produto.id));
  const addItem = usePdvCart((s) => s.addItem);
  const setQty = usePdvCart((s) => s.setQty);
  const removeItem = usePdvCart((s) => s.removeItem);
  const [pulsando, setPulsando] = useState(false);

  const semEstoque = produto.estoque <= 0;

  const handleAdd = () => {
    if (semEstoque) return;
    addItem(produto);
    setPulsando(true);
    setTimeout(() => setPulsando(false), 150);
  };

  return (
    <Card
      variant={semEstoque ? 'default' : 'interactive'}
      onClick={handleAdd}
      className={cn(
        'flex flex-col overflow-hidden p-0',
        semEstoque && 'cursor-not-allowed opacity-50',
        pulsando && 'scale-95',
      )}
    >
      <div className="relative aspect-square w-full bg-muted">
        {produto.imagemUrl ? (
          <img src={produto.imagemUrl} alt={produto.nome} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageOff className="h-8 w-8" />
          </div>
        )}
        {item && (
          <span className="absolute right-1.5 top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground shadow">
            {item.quantidade}
          </span>
        )}
        {produto.estoqueBaixo && !semEstoque && (
          <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-medium text-white">
            <TriangleAlert className="h-2.5 w-2.5" /> Últimas
          </span>
        )}
        {semEstoque && (
          <span className="absolute inset-x-0 bottom-0 bg-foreground/80 px-2 py-1 text-center text-[11px] font-medium text-background">
            Esgotado
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <p className="line-clamp-2 text-sm font-medium leading-tight">{produto.nome}</p>
        <div className="mt-auto flex items-end justify-between gap-1">
          <p className="font-semibold text-brand-gold">
            {formatCurrency(produto.precoVenda)}
            <span className="ml-1 text-[10px] font-normal text-muted-foreground">
              /{UNIDADE_LABEL[produto.unidade] ?? produto.unidade.toLowerCase()}
            </span>
          </p>
        </div>

        {item && (
          <div
            className="mt-1 flex items-center justify-center gap-2 rounded-full border border-primary bg-primary/5 py-1"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() =>
                item.quantidade <= 1 ? removeItem(produto.id) : setQty(produto.id, item.quantidade - 1)
              }
              className="flex h-6 w-6 items-center justify-center rounded-full text-primary hover:bg-primary/10"
              aria-label="Diminuir quantidade"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-4 text-center text-sm font-semibold">{item.quantidade}</span>
            <button
              type="button"
              onClick={() => setQty(produto.id, item.quantidade + 1)}
              className="flex h-6 w-6 items-center justify-center rounded-full text-primary hover:bg-primary/10"
              aria-label="Aumentar quantidade"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
