import { useState } from 'react';
import { Plus, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { usePurchases } from '../api/use-purchases';
import { PurchaseFormDialog } from '../components/PurchaseFormDialog';
import { PurchaseDetailDialog } from '../components/PurchaseDetailDialog';
import type { PurchaseListItem } from '../api/purchases.api';

export function PurchasesPage() {
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data, isLoading, isError } = usePurchases({ page, limit: 10 });

  const columns: Column<PurchaseListItem>[] = [
    { header: 'Fornecedor', cell: (c) => <span className="font-medium">{c.fornecedorNome}</span> },
    { header: 'Itens', cell: (c) => <Badge variant="secondary">{c.itensCount}</Badge> },
    { header: 'Total', cell: (c) => formatCurrency(c.valorTotal) },
    { header: 'Usuário', cell: (c) => <span className="text-muted-foreground">{c.usuarioNome ?? '—'}</span> },
    { header: 'Data', cell: (c) => <span className="text-muted-foreground">{formatDateTime(c.data)}</span> },
    {
      header: 'Ações',
      className: 'text-right',
      cell: (c) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="icon" onClick={() => setDetailId(c.id)} title="Ver detalhe">
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compras"
        description="Registro de compras de fornecedores"
        action={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" /> Nova compra
          </Button>
        }
      />
      <DataTable
        columns={columns}
        data={data?.data}
        isLoading={isLoading}
        isError={isError}
        getRowKey={(c) => c.id}
        emptyMessage="Nenhuma compra registrada."
        page={data?.page}
        totalPages={data?.totalPages}
        total={data?.total}
        onPageChange={setPage}
      />
      <PurchaseFormDialog open={formOpen} onOpenChange={setFormOpen} />
      <PurchaseDetailDialog purchaseId={detailId} onOpenChange={(o) => !o && setDetailId(null)} />
    </div>
  );
}
