import { useState } from 'react';
import { Plus, Pencil, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { useDebounce } from '@/hooks/use-debounce';
import { useCustomers, useSetCustomerStatus } from '../api/use-customers';
import { CustomerFormDialog } from '../components/CustomerFormDialog';
import type { Customer } from '../api/customers.api';

export function CustomersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 400);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);

  const { data, isLoading, isError } = useCustomers({ page, limit: 10, search: debounced });
  const setStatus = useSetCustomerStatus();

  const columns: Column<Customer>[] = [
    { header: 'Nome', cell: (c) => <span className="font-medium">{c.nome}</span> },
    { header: 'CPF', cell: (c) => <span className="text-muted-foreground">{c.cpf ?? '—'}</span> },
    { header: 'Telefone', cell: (c) => <span className="text-muted-foreground">{c.telefone ?? '—'}</span> },
    {
      header: 'Status',
      cell: (c) => (
        <Badge variant={c.ativo ? 'success' : 'warning'}>{c.ativo ? 'Ativo' : 'Inativo'}</Badge>
      ),
    },
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
            onClick={() => setStatus.mutate({ id: c.id, ativo: !c.ativo })}
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
        title="Clientes"
        description="Cadastro de clientes do mercadinho"
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Novo cliente
          </Button>
        }
      />
      <DataTable
        columns={columns}
        data={data?.data}
        isLoading={isLoading}
        isError={isError}
        getRowKey={(c) => c.id}
        emptyMessage="Nenhum cliente cadastrado."
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Buscar por nome, CPF ou telefone..."
        page={data?.page}
        totalPages={data?.totalPages}
        total={data?.total}
        onPageChange={setPage}
      />
      <CustomerFormDialog open={dialogOpen} onOpenChange={setDialogOpen} customer={editing} />
    </div>
  );
}
