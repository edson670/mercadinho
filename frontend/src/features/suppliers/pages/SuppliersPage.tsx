import { useState } from 'react';
import { Plus, Pencil, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { useDebounce } from '@/hooks/use-debounce';
import { useSuppliers, useSetSupplierStatus } from '../api/use-suppliers';
import { SupplierFormDialog } from '../components/SupplierFormDialog';
import type { Supplier } from '../api/suppliers.api';

export function SuppliersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 400);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  const { data, isLoading, isError } = useSuppliers({ page, limit: 10, search: debounced });
  const setStatus = useSetSupplierStatus();

  const columns: Column<Supplier>[] = [
    { header: 'Nome', cell: (s) => <span className="font-medium">{s.nome}</span> },
    { header: 'Telefone', cell: (s) => <span className="text-muted-foreground">{s.telefone ?? '—'}</span> },
    { header: 'Endereço', cell: (s) => <span className="text-muted-foreground">{s.endereco ?? '—'}</span> },
    {
      header: 'Status',
      cell: (s) => (
        <Badge variant={s.ativo ? 'success' : 'warning'}>{s.ativo ? 'Ativo' : 'Inativo'}</Badge>
      ),
    },
    {
      header: 'Ações',
      className: 'text-right',
      cell: (s) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setEditing(s);
              setDialogOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title={s.ativo ? 'Inativar' : 'Ativar'}
            onClick={() => setStatus.mutate({ id: s.id, ativo: !s.ativo })}
          >
            <Power className={s.ativo ? 'h-4 w-4 text-emerald-600' : 'h-4 w-4 text-muted-foreground'} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fornecedores"
        description="Cadastro de fornecedores"
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Novo fornecedor
          </Button>
        }
      />
      <DataTable
        columns={columns}
        data={data?.data}
        isLoading={isLoading}
        isError={isError}
        getRowKey={(s) => s.id}
        emptyMessage="Nenhum fornecedor cadastrado."
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Buscar por nome ou telefone..."
        page={data?.page}
        totalPages={data?.totalPages}
        total={data?.total}
        onPageChange={setPage}
      />
      <SupplierFormDialog open={dialogOpen} onOpenChange={setDialogOpen} supplier={editing} />
    </div>
  );
}
