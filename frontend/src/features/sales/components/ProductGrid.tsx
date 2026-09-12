import { useEffect, useRef, useState } from 'react';
import { Loader2, PackageSearch, ScanLine, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDebounce } from '@/hooks/use-debounce';
import { useProducts } from '../../products/api/use-products';
import { findProductByBarcode } from '../../products/api/products.api';
import { useAllCategories } from '../../categories/api/use-categories';
import { usePdvCart } from '@/stores/pdv-cart.store';
import { toast } from '@/stores/toast.store';
import { ProductGridCard } from './ProductGridCard';

const TODAS = '__todas__';

/** Grade de produtos do PDV: busca + abas de categoria + cartões clicáveis. */
export function ProductGrid() {
  const [search, setSearch] = useState('');
  const [categoriaId, setCategoriaId] = useState(TODAS);
  const [bipando, setBipando] = useState(false);
  const debouncedSearch = useDebounce(search, 300);
  const addItem = usePdvCart((s) => s.addItem);
  const buscaRef = useRef<HTMLInputElement>(null);

  /**
   * O leitor precisa do campo focado, mas o `autoFocus` do HTML rola a
   * página até ele — e a grade agora fica abaixo da venda, então a tela
   * abriria já rolada, com o total fora de vista. `preventScroll` dá o foco
   * sem mexer no scroll.
   */
  useEffect(() => {
    buscaRef.current?.focus({ preventScroll: true });
  }, []);

  /**
   * Um leitor de código de barras se comporta como teclado: digita o código
   * e manda Enter. Aqui o Enter tenta a busca exata pelo código e joga o
   * produto direto no carrinho — sem isto o operador tinha que localizar o
   * item na grade e clicar, o que anula o ganho de bipar.
   *
   * Não achando o código, o termo continua valendo como filtro de texto, que
   * é o comportamento útil para quem digitou um nome e apertou Enter.
   */
  const handleBipe = async () => {
    const codigo = search.trim();
    if (!codigo || bipando) return;

    setBipando(true);
    try {
      const produto = await findProductByBarcode(codigo);
      if (!produto) return;

      if (!produto.ativo || produto.estoque <= 0) {
        toast.error(`${produto.nome} está sem estoque.`);
        return;
      }
      addItem(produto);
      toast.success(`${produto.nome} adicionado.`);
      // Limpa para o próximo bipe já cair num campo vazio.
      setSearch('');
      buscaRef.current?.focus({ preventScroll: true });
    } finally {
      setBipando(false);
    }
  };

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
          ref={buscaRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              // Não deixa o Enter subir para o atalho global de finalizar
              // venda do PdvPage.
              e.preventDefault();
              e.stopPropagation();
              void handleBipe();
            }
          }}
          placeholder="Bipe o código de barras ou busque por nome..."
          className="pl-9 pr-9"
        />
        {bipando ? (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : (
          <ScanLine className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        )}
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

      {/* A grade ocupa a largura toda agora; cabe mais uma coluna sem
          apertar o cartão. */}
      {!isLoading && data && data.data.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {data.data.map((produto) => (
            <ProductGridCard key={produto.id} produto={produto} />
          ))}
        </div>
      )}
    </div>
  );
}
