import { useEffect, useRef, useState } from 'react';
import { Minus, Plus, ScanLine, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePdvCart } from '@/stores/pdv-cart.store';
import { precoEfetivo } from '@/features/products/api/products.api';
import { cn, formatCurrency } from '@/lib/utils';

/** Quanto tempo a linha recém-bipada fica destacada. */
const DESTAQUE_MS = 1200;

/**
 * A lista que o leitor vai alimentando. Fica ao lado do total de propósito:
 * antes vivia embaixo da grade de produtos, e o operador tinha que desviar o
 * olhar da coluna do total justamente enquanto conferia o que bipou.
 */
export function CartList({ className }: { className?: string }) {
  const items = usePdvCart((s) => s.items);
  const setQty = usePdvCart((s) => s.setQty);
  const removeItem = usePdvCart((s) => s.removeItem);
  const ultimoBipe = usePdvCart((s) => s.ultimoBipe);

  const [destaque, setDestaque] = useState<string | null>(null);
  const linhaDestacada = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    if (!ultimoBipe) return;
    setDestaque(ultimoBipe.produtoId);
    const t = setTimeout(() => setDestaque(null), DESTAQUE_MS);
    return () => clearTimeout(t);
  }, [ultimoBipe]);

  // Com a lista rolando, o item bipado podia cair fora da área visível — o
  // operador bipava e não via nada acontecer. `nearest` não mexe na página.
  useEffect(() => {
    if (destaque) linhaDestacada.current?.scrollIntoView({ block: 'nearest' });
  }, [destaque]);

  const quantidadeTotal = items.reduce((acc, i) => acc + i.quantidade, 0);

  return (
    // O limite de altura precisa vir no próprio contêiner flex: com ele num
    // wrapper acima, o `flex-1 min-h-0` da lista não tinha contra o que
    // resolver e a rolagem interna não acontecia.
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ScanLine className="h-[18px] w-[18px] text-primary" />
          Itens da venda
        </CardTitle>
        {items.length > 0 && (
          <span className="tabular text-xs font-semibold text-muted-foreground">
            {items.length} {items.length === 1 ? 'produto' : 'produtos'} ·{' '}
            {Number(quantidadeTotal.toFixed(3))} un.
          </span>
        )}
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col p-0">
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-12 text-center">
            <ScanLine className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">Nenhum item ainda</p>
            <p className="text-xs text-muted-foreground/80">
              Bipe o código de barras ou toque em um produto ao lado.
            </p>
          </div>
        ) : (
          <ul className="min-h-0 flex-1 divide-y overflow-y-auto">
            {items.map((item) => {
              const ehDestaque = destaque === item.product.id;
              const unitario = precoEfetivo(item.product);

              return (
                <li
                  key={item.product.id}
                  ref={ehDestaque ? linhaDestacada : undefined}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 transition-colors duration-300 ease-fluid',
                    ehDestaque && 'bg-primary/10',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{item.product.nome}</p>
                    <p className="tabular text-xs text-muted-foreground">
                      {formatCurrency(unitario)} / {item.product.unidade}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => setQty(item.product.id, item.quantidade - 1)}
                      disabled={item.quantidade <= 1}
                      aria-label={`Diminuir ${item.product.nome}`}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      className="tabular h-7 w-14 px-1 text-center"
                      type="number"
                      step="0.001"
                      value={item.quantidade}
                      onChange={(e) => setQty(item.product.id, Number(e.target.value) || 1)}
                      aria-label={`Quantidade de ${item.product.nome}`}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => setQty(item.product.id, item.quantidade + 1)}
                      aria-label={`Aumentar ${item.product.nome}`}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="tabular w-[74px] shrink-0 text-right text-sm font-bold">
                    {formatCurrency(unitario * item.quantidade)}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeItem(item.product.id)}
                    aria-label={`Remover ${item.product.nome}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
