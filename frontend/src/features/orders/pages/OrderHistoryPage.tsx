import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { useOrdersHistory } from '../api/use-orders';
import { OrderDetailDialog } from '../components/OrderDetailDialog';
import type { OrderListItem, StatusPedido } from '../api/orders.api';

const STATUS_LABEL: Record<StatusPedido, string> = {
  RECEBIDO: 'Recebido',
  EM_SEPARACAO: 'Em separação',
  SAIU_PARA_ENTREGA: 'Saiu para entrega',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};

const STATUS_VARIANT: Record<StatusPedido, 'secondary' | 'success' | 'destructive'> = {
  RECEBIDO: 'secondary',
  EM_SEPARACAO: 'secondary',
  SAIU_PARA_ENTREGA: 'secondary',
  ENTREGUE: 'success',
  CANCELADO: 'destructive',
};

export function OrderHistoryPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusPedido | ''>('');
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data, isLoading, isError } = useOrdersHistory({
    page,
    limit: 10,
    search: search || undefined,
    status: status || undefined,
  });

  const columns: Column<OrderListItem>[] = [
    { header: '#', cell: (v) => <span className="font-medium">#{v.numero}</span> },
    { header: 'Cliente', cell: (v) => v.nomeCliente },
    { header: 'Bairro', cell: (v) => <span className="text-muted-foreground">{v.bairro}</span> },
    { header: 'Pagamento', cell: (v) => <Badge variant="secondary">{v.formaPagamento}</Badge> },
    {
      header: 'Status',
      cell: (v) => <Badge variant={STATUS_VARIANT[v.status]}>{STATUS_LABEL[v.status]}</Badge>,
    },
    { header: 'Total', cell: (v) => formatCurrency(v.total) },
    { header: 'Data', cell: (v) => <span className="text-muted-foreground">{formatDateTime(v.criadoEm)}</span> },
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
        title="Histórico de pedidos"
        description="Todos os pedidos recebidos pelo catálogo, incluindo entregues e cancelados"
        action={
          <Button variant="outline" onClick={() => navigate('/pedidos-whatsapp')}>
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
        }
      />

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Filtrar:</span>
        <div className="w-56">
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as StatusPedido | '');
              setPage(1);
            }}
          >
            <option value="">Todos os status</option>
            {(Object.keys(STATUS_LABEL) as StatusPedido[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.data}
        isLoading={isLoading}
        isError={isError}
        getRowKey={(v) => v.id}
        emptyMessage="Nenhum pedido encontrado."
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Buscar por cliente ou telefone..."
        page={data?.page}
        totalPages={data?.totalPages}
        total={data?.total}
        onPageChange={setPage}
      />

      <OrderDetailDialog orderId={detailId} onOpenChange={(o) => !o && setDetailId(null)} />
    </div>
  );
}
