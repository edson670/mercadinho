import { ShoppingBag } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useCartStore } from '../store/cart.store';

export function CartBar({ onOpen }: { onOpen: () => void }) {
  const count = useCartStore((s) => s.count());
  const total = useCartStore((s) => s.total());

  if (count === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-2xl px-4 pb-4">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center justify-between rounded-xl bg-primary px-4 py-3.5 text-primary-foreground shadow-lg"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-foreground/20">
            <ShoppingBag className="h-3.5 w-3.5" />
          </span>
          {count} {count === 1 ? 'item' : 'itens'}
        </span>
        <span className="text-sm font-semibold">Ver sacola · {formatCurrency(total)}</span>
      </button>
    </div>
  );
}
