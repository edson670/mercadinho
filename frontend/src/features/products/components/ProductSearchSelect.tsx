import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn, formatCurrency } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import { searchProducts, type Product } from '../api/products.api';

interface Props {
  value: Product | null;
  onSelect: (product: Product | null) => void;
  placeholder?: string;
}

/** Campo de busca com dropdown de produtos ativos (por nome/código de barras). */
export function ProductSearchSelect({ value, onSelect, placeholder = 'Buscar produto...' }: Props) {
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const debounced = useDebounce(term, 300);

  const { data: results, isFetching } = useQuery({
    queryKey: ['product-search', debounced],
    queryFn: () => searchProducts(debounced),
    enabled: open && debounced.trim().length > 0,
  });

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
        <div>
          <p className="text-sm font-medium">{value.nome}</p>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(value.precoVenda)} · estoque {value.estoque} {value.unidade}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        className="pl-9"
        placeholder={placeholder}
        value={term}
        onChange={(e) => {
          setTerm(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && debounced.trim() && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover shadow-md">
          {isFetching && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isFetching && results?.length === 0 && (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
              Nenhum produto encontrado.
            </p>
          )}
          {results?.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onSelect(p);
                setTerm('');
                setOpen(false);
              }}
              className={cn(
                'flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent',
              )}
            >
              <span>
                <span className="font-medium">{p.nome}</span>
                {p.codigoBarras && (
                  <span className="ml-2 text-xs text-muted-foreground">{p.codigoBarras}</span>
                )}
              </span>
              <span className="text-xs text-muted-foreground">
                {p.estoque} {p.unidade}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
