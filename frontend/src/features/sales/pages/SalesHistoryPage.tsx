import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { useSales } from '../api/use-sales';
import { SaleDetailDialog } from '../components/SaleDetailDialog';
import type { SaleListItem } from '../api/sales.api';

export function SalesHistoryPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);
  const { data, isLoading, isError } = useSales({ page, limit: 10 });

  const columns: Column<SaleListItem>[] = [
    { header: '#', cell: (v) => <span className="font-medium">#{v.numero}</span> },
    { header: 'Cliente', cell: (v) => v.clienteNome ?? <span className="text-muted-foreground">Consumidor</span> },
    { header: 'Pagamento', cell: (v) => <Badge variant="secondary">{v.formaPagamento}</Badge> },
    {
      header: 'Status',
      cell: (v) => (
        <Badge variant={v.status === 'CONCLUIDA' ? 'success' : 'destructive'}>
          {v.status === 'CONCLUIDA' ? 'Concluída' : 'Cancelada'}
        </Badge>
      ),
    },
    { header: 'Total', cell: (v) => formatCurrency(v.total) },
    { header: 'Data', cell: (v) => <span className="text-muted-foreground">{formatDateTime(v.data)}</span> },
    {
      header: 'Ações',
      className: 'text-right',
      cell: (v) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="icon" onClick={() => setDetailId(v.id)} title="Ver detalhe">
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Histórico de vendas"
        description="Vendas registradas no PDV"
        action={
          <Button variant="outline" onClick={() => navigate('/vendas')}>
            <ArrowLeft className="h-4 w-4" /> Voltar ao PDV
          </Button>
        }
      />
      <DataTable
        columns={columns}
        data={data?.data}
        isLoading={isLoading}
        isError={isError}
        getRowKey={(v) => v.id}
        emptyMessage="Nenhuma venda registrada."
        page={data?.page}
        totalPages={data?.totalPages}
        total={data?.total}
        onPageChange={setPage}
      />
      <SaleDetailDialog saleId={detailId} onOpenChange={(o) => !o && setDetailId(null)} />
    </div>
  );
}
