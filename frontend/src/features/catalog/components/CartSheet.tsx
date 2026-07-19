import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { useCartStore } from '../store/cart.store';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCheckout: () => void;
}

export function CartSheet({ open, onOpenChange, onCheckout }: Props) {
  const items = useCartStore((s) => s.items);
  const increment = useCartStore((s) => s.increment);
  const decrement = useCartStore((s) => s.decrement);
  const remove = useCartStore((s) => s.remove);
  const total = useCartStore((s) => s.total());

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[80vh] p-0">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" /> Sua sacola
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <p className="px-4 pb-6 text-sm text-muted-foreground">Sua sacola está vazia.</p>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4">
              {items.map((item) => (
                <div key={item.produtoId} className="flex items-center gap-3 border-b py-3 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-medium">{item.nome}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(item.preco)} cada</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border px-1 py-1">
                    <button
                      type="button"
                      onClick={() => decrement(item.produtoId)}
                      className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-accent"
                      aria-label="Diminuir quantidade"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="min-w-4 text-center text-sm font-semibold">{item.quantidade}</span>
                    <button
                      type="button"
                      onClick={() => increment(item.produtoId)}
                      className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-accent"
                      aria-label="Aumentar quantidade"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(item.produtoId)}
                    className="rounded-full p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Remover ${item.nome}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t p-4">
              <div className="mb-3 flex items-center justify-between text-base font-semibold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <Button className="w-full" size="lg" onClick={onCheckout}>
                Continuar para entrega
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
