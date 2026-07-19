import { useQuery } from '@tanstack/react-query';
import { Store, Search, X } from 'lucide-react';
import { getBranding } from '@/features/settings/api/settings.api';
import { Input } from '@/components/ui/input';

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
}

export function CatalogHeader({ search, onSearchChange }: Props) {
  const { data: branding } = useQuery({
    queryKey: ['branding'],
    queryFn: getBranding,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const nome = branding?.nome || 'Mercadinho';

  return (
    <header className="sticky top-0 z-20 bg-primary text-primary-foreground shadow-sm">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 pb-3 pt-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-foreground/10 ring-2 ring-brand-gold/70">
          {branding?.logoUrl ? (
            <img src={branding.logoUrl} alt={nome} className="h-full w-full object-cover" />
          ) : (
            <Store className="h-6 w-6" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold leading-tight">{nome}</p>
          <p className="text-xs text-primary-foreground/80">Peça pelo catálogo, sem espera</p>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 pb-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar produto..."
            className="border-0 bg-background pl-9 pr-9 text-foreground shadow-sm"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-accent"
              aria-label="Limpar busca"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
