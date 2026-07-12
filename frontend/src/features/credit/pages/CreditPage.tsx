import { useState } from 'react';
import { Eye, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useCreditList, useOverdue } from '../api/use-credit';
import { CreditDetailDialog } from '../components/CreditDetailDialog';
import type { Fiado, StatusFiado } from '../api/credit.api';

const statusBadge: Record<StatusFiado, { label: string; variant: 'success' | 'warning' | 'destructive' }> = {
  ABERTO: { label: 'Aberto', variant: 'destructive' },
  PARCIAL: { label: 'Parcial', variant: 'warning' },
  QUITADO: { label: 'Quitado', variant: 'success' },
};

export function CreditPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StatusFiado | ''>('');
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data, isLoading, isError } = useCreditList({
    page,
    limit: 10,
    status: status || undefined,
  });
  const { data: overdue } = useOverdue();

  const totalDevido = overdue?.reduce((acc, o) => acc + o.totalDevido, 0) ?? 0;

  const columns: Column<Fiado>[] = [
    { header: 'Cliente', cell: (f) => <span className="font-medium">{f.clienteNome}</span> },
    { header: 'Venda', cell: (f) => (f.vendaNumero ? `#${f.vendaNumero}` : '—') },
    { header: 'Original', cell: (f) => formatCurrency(f.valorOriginal) },
    { header: 'Saldo', cell: (f) => <span className="font-medium text-destructive">{formatCurrency(f.saldo)}</span> },
    {
      header: 'Status',
      cell: (f) => <Badge variant={statusBadge[f.status].variant}>{statusBadge[f.status].label}</Badge>,
    },
    { header: 'Data', cell: (f) => <span className="text-muted-foreground">{formatDate(f.criadoEm)}</span> },
    {
      header: 'Ações',
      className: 'text-right',
      cell: (f) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="icon" onClick={() => setDetailId(f.id)} title="Ver / pagar">
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Fiado" description="Controle de crédito dos clientes" />

      {/* Resumo de inadimplentes */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total em aberto</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(totalDevido)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Users className="h-4 w-4" /> Clientes inadimplentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{overdue?.length ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Inadimplentes */}
      {overdue && overdue.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Maiores devedores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {overdue.slice(0, 8).map((o) => (
                <div key={o.clienteId} className="rounded-md border px-3 py-2 text-sm">
                  <p className="font-medium">{o.clienteNome}</p>
                  <p className="text-xs text-destructive">
                    {formatCurrency(o.totalDevido)} · {o.quantidadeFiados} fiado(s)
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de fiados */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtrar:</span>
          <div className="w-48">
            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as StatusFiado | '');
                setPage(1);
              }}
            >
              <option value="">Todos</option>
              <option value="ABERTO">Aberto</option>
              <option value="PARCIAL">Parcial</option>
              <option value="QUITADO">Quitado</option>
            </Select>
          </div>
        </div>
        <DataTable
          columns={columns}
          data={data?.data}
          isLoading={isLoading}
          isError={isError}
          getRowKey={(f) => f.id}
          emptyMessage="Nenhum fiado encontrado."
          page={data?.page}
          totalPages={data?.totalPages}
          total={data?.total}
          onPageChange={setPage}
        />
      </div>

      <CreditDetailDialog fiadoId={detailId} onOpenChange={(o) => !o && setDetailId(null)} />
    </div>
  );
}
