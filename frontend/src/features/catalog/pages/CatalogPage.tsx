import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/use-debounce';
import { PackageSearch } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { listCatalogProducts, resolveWhatsAppSession } from '../api/catalog.api';
import { useCatalogSessionStore } from '../store/session.store';
import { CatalogHeader } from '../components/CatalogHeader';
import { CategoryChips } from '../components/CategoryChips';
import { ProductRow } from '../components/ProductRow';
import { CartBar } from '../components/CartBar';
import { CartSheet } from '../components/CartSheet';

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const debouncedSearch = useDebounce(search, 300);
  const setSession = useCatalogSessionStore((s) => s.set);

  const sessionToken = searchParams.get('s');

  useEffect(() => {
    if (!sessionToken) return;
    resolveWhatsAppSession(sessionToken)
      .then((data) => setSession(data))
      .catch(() => undefined)
      .finally(() => {
        const next = new URLSearchParams(searchParams);
        next.delete('s');
        setSearchParams(next, { replace: true });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionToken]);

  const { data, isLoading } = useQuery({
    queryKey: ['catalogo', 'produtos', debouncedSearch, categoriaId],
    queryFn: () =>
      listCatalogProducts({
        search: debouncedSearch || undefined,
        categoriaId: categoriaId || undefined,
        limit: 50,
      }),
  });

  return (
    <div className="min-h-screen bg-background pb-24">
      <CatalogHeader search={search} onSearchChange={setSearch} />
      <CategoryChips selected={categoriaId} onSelect={setCategoriaId} />

      <main className="mx-auto max-w-2xl">
        {isLoading && (
          <div className="divide-y">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3 p-4">
                <Skeleton className="h-20 w-20 shrink-0 rounded-lg" />
                <div className="flex-1 space-y-2 py-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && data?.data.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
            <PackageSearch className="h-10 w-10" />
            <p className="text-sm">Nenhum produto encontrado.</p>
          </div>
        )}

        {!isLoading && data && data.data.length > 0 && (
          <div>
            {data.data.map((produto) => (
              <ProductRow key={produto.id} produto={produto} />
            ))}
          </div>
        )}
      </main>

      <CartBar onOpen={() => setCartOpen(true)} />
      <CartSheet
        open={cartOpen}
        onOpenChange={setCartOpen}
        onCheckout={() => {
          setCartOpen(false);
          navigate('/catalogo/checkout');
        }}
      />
    </div>
  );
}
