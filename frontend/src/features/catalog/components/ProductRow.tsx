import { ImageOff, Minus, Plus, TriangleAlert } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useCartStore } from '../store/cart.store';
import type { CatalogProduct } from '../api/catalog.api';

const UNIDADE_LABEL: Record<string, string> = {
  UN: 'un.',
  KG: 'kg',
  L: 'litro',
  CX: 'caixa',
  PCT: 'pacote',
};

export function ProductRow({ produto }: { produto: CatalogProduct }) {
  const item = useCartStore((s) => s.items.find((i) => i.produtoId === produto.id));
  const add = useCartStore((s) => s.add);
  const increment = useCartStore((s) => s.increment);
  const decrement = useCartStore((s) => s.decrement);

  const esgotado = produto.disponibilidade === 'ESGOTADO';
  const ultimasUnidades = produto.disponibilidade === 'ULTIMAS_UNIDADES';

  return (
    <div className={cn('flex gap-3 border-b p-4', esgotado && 'opacity-60')}>
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
        {produto.imagemUrl ? (
          <img src={produto.imagemUrl} alt={produto.nome} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageOff className="h-6 w-6" />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <p className="line-clamp-1 text-sm font-medium">{produto.nome}</p>
          {produto.descricao && (
            <p className="line-clamp-2 text-xs text-muted-foreground">{produto.descricao}</p>
          )}
        </div>

        <div className="mt-1 flex items-end justify-between gap-2">
          <div>
            {produto.emPromocao && produto.precoOriginal && (
              <p className="text-xs text-muted-foreground line-through">
                {formatCurrency(produto.precoOriginal)}
              </p>
            )}
            <p className={cn('text-sm font-semibold', produto.emPromocao && 'text-destructive')}>
              {formatCurrency(produto.preco)}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                /{UNIDADE_LABEL[produto.unidade] ?? produto.unidade.toLowerCase()}
              </span>
            </p>
            {ultimasUnidades && (
              <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-500">
                <TriangleAlert className="h-3 w-3" /> Últimas unidades
              </p>
            )}
            {esgotado && <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">Esgotado</p>}
          </div>

          {!esgotado &&
            (item ? (
              <div className="flex items-center gap-2 rounded-full border border-primary bg-primary/5 px-1 py-1">
                <button
                  type="button"
                  onClick={() => decrement(produto.id)}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-primary hover:bg-primary/10"
                  aria-label="Diminuir quantidade"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="min-w-4 text-center text-sm font-semibold">{item.quantidade}</span>
                <button
                  type="button"
                  onClick={() => increment(produto.id)}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-primary hover:bg-primary/10"
                  aria-label="Aumentar quantidade"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => add(produto)}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                aria-label={`Adicionar ${produto.nome}`}
              >
                <Plus className="h-4 w-4" />
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
