import { useState } from 'react';
import { Plus, Pencil, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { useDebounce } from '@/hooks/use-debounce';
import { formatDate } from '@/lib/utils';
import { useCategories, useUpdateCategory } from '../api/use-categories';
import { CategoryFormDialog } from '../components/CategoryFormDialog';
import type { Category } from '../api/categories.api';

export function CategoriesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 400);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const { data, isLoading, isError } = useCategories({ page, limit: 10, search: debounced });
  const updateMutation = useUpdateCategory();

  const columns: Column<Category>[] = [
    { header: 'Nome', cell: (c) => <span className="font-medium">{c.nome}</span> },
    {
      header: 'Status',
      cell: (c) => (
        <Badge variant={c.ativo ? 'success' : 'warning'}>{c.ativo ? 'Ativa' : 'Inativa'}</Badge>
      ),
    },
    { header: 'Criada em', cell: (c) => <span className="text-muted-foreground">{formatDate(c.criadoEm)}</span> },
    {
      header: 'Ações',
      className: 'text-right',
      cell: (c) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setEditing(c);
              setDialogOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title={c.ativo ? 'Inativar' : 'Ativar'}
            onClick={() => updateMutation.mutate({ id: c.id, payload: { ativo: !c.ativo } })}
          >
            <Power className={c.ativo ? 'h-4 w-4 text-emerald-600' : 'h-4 w-4 text-muted-foreground'} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categorias"
        description="Organize os produtos por categoria"
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Nova categoria
          </Button>
        }
      />
      <DataTable
        columns={columns}
        data={data?.data}
        isLoading={isLoading}
        isError={isError}
        getRowKey={(c) => c.id}
        emptyMessage="Nenhuma categoria cadastrada."
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Buscar categoria..."
        page={data?.page}
        totalPages={data?.totalPages}
        total={data?.total}
        onPageChange={setPage}
      />
      <CategoryFormDialog open={dialogOpen} onOpenChange={setDialogOpen} category={editing} />
    </div>
  );
}
