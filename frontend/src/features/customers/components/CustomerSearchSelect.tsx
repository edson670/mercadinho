import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import { listCustomers, type Customer } from '../api/customers.api';

interface Props {
  value: Customer | null;
  onSelect: (customer: Customer | null) => void;
  placeholder?: string;
}

/** Campo de busca com dropdown de clientes ativos. */
export function CustomerSearchSelect({ value, onSelect, placeholder = 'Buscar cliente...' }: Props) {
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const debounced = useDebounce(term, 300);

  const { data, isFetching } = useQuery({
    queryKey: ['customer-search', debounced],
    queryFn: () => listCustomers({ page: 1, limit: 8, search: debounced }),
    enabled: open && debounced.trim().length > 0,
  });

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
        <div>
          <p className="text-sm font-medium">{value.nome}</p>
          {value.telefone && <p className="text-xs text-muted-foreground">{value.telefone}</p>}
        </div>
        <button type="button" onClick={() => onSelect(null)} className="text-muted-foreground hover:text-foreground">
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
        <div className="absolute z-50 mt-1 max-h-52 w-full overflow-auto rounded-md border bg-popover shadow-md">
          {isFetching && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isFetching && data?.data.length === 0 && (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
              Nenhum cliente encontrado.
            </p>
          )}
          {data?.data.filter((c) => c.ativo).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                onSelect(c);
                setTerm('');
                setOpen(false);
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
            >
              <span className="font-medium">{c.nome}</span>
              {c.telefone && <span className="text-xs text-muted-foreground">{c.telefone}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
