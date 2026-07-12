import { useState } from 'react';
import { Plus, Pencil, Power, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { useDebounce } from '@/hooks/use-debounce';
import { formatCurrency } from '@/lib/utils';
import { useProducts, useSetProductStatus } from '../api/use-products';
import { ProductFormDialog } from '../components/ProductFormDialog';
import { unidadeLabels } from '../schemas/product.schema';
import type { Product } from '../api/products.api';

export function ProductsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 400);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const { data, isLoading, isError } = useProducts({ page, limit: 10, search: debounced });
  const setStatus = useSetProductStatus();

  const columns: Column<Product>[] = [
    {
      header: 'Produto',
      cell: (p) => (
        <div>
          <span className="font-medium">{p.nome}</span>
          {p.codigoBarras && <p className="text-xs text-muted-foreground">{p.codigoBarras}</p>}
        </div>
      ),
    },
    { header: 'Categoria', cell: (p) => <Badge variant="secondary">{p.categoriaNome}</Badge> },
    { header: 'Venda', cell: (p) => formatCurrency(p.precoVenda) },
    {
      header: 'Estoque',
      cell: (p) => (
        <span className="inline-flex items-center gap-1">
          {p.estoque} {p.unidade}
          {p.estoqueBaixo && <AlertTriangle className="h-4 w-4 text-amber-500" />}
        </span>
      ),
    },
    { header: 'Unid.', cell: (p) => <span className="text-muted-foreground">{unidadeLabels[p.unidade]}</span> },
    {
      header: 'Status',
      cell: (p) => (
        <Badge variant={p.ativo ? 'success' : 'warning'}>{p.ativo ? 'Ativo' : 'Inativo'}</Badge>
      ),
    },
    {
      header: 'Ações',
      className: 'text-right',
      cell: (p) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setEditing(p);
              setDialogOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title={p.ativo ? 'Inativar' : 'Ativar'}
            onClick={() => setStatus.mutate({ id: p.id, ativo: !p.ativo })}
          >
            <Power className={p.ativo ? 'h-4 w-4 text-emerald-600' : 'h-4 w-4 text-muted-foreground'} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Produtos"
        description="Catálogo de produtos do mercadinho"
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Novo produto
          </Button>
        }
      />
      <DataTable
        columns={columns}
        data={data?.data}
        isLoading={isLoading}
        isError={isError}
        getRowKey={(p) => p.id}
        emptyMessage="Nenhum produto cadastrado."
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Buscar por nome ou código..."
        page={data?.page}
        totalPages={data?.totalPages}
        total={data?.total}
        onPageChange={setPage}
      />
      <ProductFormDialog open={dialogOpen} onOpenChange={setDialogOpen} product={editing} />
    </div>
  );
}
