import { useState } from 'react';
import { Loader2, PackageSearch, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDebounce } from '@/hooks/use-debounce';
import { useProducts } from '../../products/api/use-products';
import { useAllCategories } from '../../categories/api/use-categories';
import { ProductGridCard } from './ProductGridCard';

const TODAS = '__todas__';

/** Grade de produtos do PDV: busca + abas de categoria + cartões clicáveis. */
export function ProductGrid() {
  const [search, setSearch] = useState('');
  const [categoriaId, setCategoriaId] = useState(TODAS);
  const debouncedSearch = useDebounce(search, 300);

  const { data: categorias } = useAllCategories();
  const { data, isLoading } = useProducts({
    ativo: true,
    search: debouncedSearch || undefined,
    categoriaId: categoriaId === TODAS ? undefined : categoriaId,
    limit: 60,
  });

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar produto por nome ou código de barras..."
          className="pl-9"
        />
      </div>

      <Tabs value={categoriaId} onValueChange={setCategoriaId}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value={TODAS}>Todas</TabsTrigger>
          {categorias?.map((c) => (
            <TabsTrigger key={c.id} value={c.id}>
              {c.nome}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading && (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && data?.data.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
          <PackageSearch className="h-8 w-8" />
          <p className="text-sm">Nenhum produto encontrado.</p>
        </div>
      )}

      {!isLoading && data && data.data.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {data.data.map((produto) => (
            <ProductGridCard key={produto.id} produto={produto} />
          ))}
        </div>
      )}
    </div>
  );
}
