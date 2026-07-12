import { useState } from 'react';
import { PackagePlus, SlidersHorizontal, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { formatDateTime } from '@/lib/utils';
import { useMovements, useLowStock } from '../api/use-stock';
import { StockMovementDialog } from '../components/StockMovementDialog';
import type { Movement } from '../api/stock.api';

const tipoBadge: Record<Movement['tipo'], { label: string; variant: 'success' | 'warning' | 'secondary' }> = {
  ENTRADA: { label: 'Entrada', variant: 'success' },
  SAIDA: { label: 'Saída', variant: 'warning' },
  AJUSTE: { label: 'Ajuste', variant: 'secondary' },
};

const origemLabel: Record<Movement['origem'], string> = {
  VENDA: 'Venda',
  COMPRA: 'Compra',
  AJUSTE_MANUAL: 'Manual',
  CANCELAMENTO: 'Cancelamento',
};

export function StockPage() {
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<null | 'entry' | 'adjust'>(null);

  const { data, isLoading, isError } = useMovements({ page, limit: 10 });
  const { data: lowStock } = useLowStock();

  const columns: Column<Movement>[] = [
    { header: 'Produto', cell: (m) => <span className="font-medium">{m.produtoNome}</span> },
    {
      header: 'Tipo',
      cell: (m) => <Badge variant={tipoBadge[m.tipo].variant}>{tipoBadge[m.tipo].label}</Badge>,
    },
    { header: 'Origem', cell: (m) => <span className="text-muted-foreground">{origemLabel[m.origem]}</span> },
    {
      header: 'Qtd.',
      cell: (m) => (
        <span className={m.tipo === 'SAIDA' ? 'text-amber-600' : 'text-emerald-600'}>
          {m.tipo === 'SAIDA' ? '-' : '+'}
          {m.quantidade}
        </span>
      ),
    },
    { header: 'Saldo', cell: (m) => `${m.estoqueAnterior} → ${m.estoqueResultante}` },
    { header: 'Usuário', cell: (m) => <span className="text-muted-foreground">{m.usuarioNome ?? '—'}</span> },
    { header: 'Data', cell: (m) => <span className="text-muted-foreground">{formatDateTime(m.criadoEm)}</span> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estoque"
        description="Movimentações, entradas e ajustes"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setDialog('adjust')}>
              <SlidersHorizontal className="h-4 w-4" /> Ajustar
            </Button>
            <Button onClick={() => setDialog('entry')}>
              <PackagePlus className="h-4 w-4" /> Entrada
            </Button>
          </div>
        }
      />

      {/* Alertas de estoque mínimo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Estoque baixo
            {lowStock && lowStock.length > 0 && (
              <Badge variant="warning">{lowStock.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!lowStock || lowStock.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum produto abaixo do mínimo. 🎉</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {lowStock.map((item) => (
                <div
                  key={item.id}
                  className="rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-sm"
                >
                  <p className="font-medium">{item.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.estoque} / mín. {item.estoqueMinimo} {item.unidade}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Histórico de movimentações</h2>
        <DataTable
          columns={columns}
          data={data?.data}
          isLoading={isLoading}
          isError={isError}
          getRowKey={(m) => m.id}
          emptyMessage="Nenhuma movimentação registrada."
          page={data?.page}
          totalPages={data?.totalPages}
          total={data?.total}
          onPageChange={setPage}
        />
      </div>

      <StockMovementDialog
        open={dialog !== null}
        onOpenChange={(o) => !o && setDialog(null)}
        mode={dialog ?? 'entry'}
      />
    </div>
  );
}
