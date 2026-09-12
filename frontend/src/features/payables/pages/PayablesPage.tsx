import { useState } from 'react';
import { AlertTriangle, CalendarClock, Eye, Pencil, Plus, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { cn, formatCurrency } from '@/lib/utils';
import { usePayableSummary, usePayables } from '../api/use-payables';
import {
  CATEGORIAS,
  CATEGORIA_LABEL,
  type CategoriaDespesa,
  type Payable,
  type StatusContaPagar,
} from '../api/payables.api';
import { STATUS_BADGE } from '../components/status-badge';
import { PayableFormDialog } from '../components/PayableFormDialog';
import { PayableDetailDialog } from '../components/PayableDetailDialog';
import { formatVencimento, rotuloPrazo } from '../lib/vencimento';

export function PayablesPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StatusContaPagar | ''>('');
  const [categoria, setCategoria] = useState<CategoriaDespesa | ''>('');
  const [search, setSearch] = useState('');
  const [somenteVencidas, setSomenteVencidas] = useState(false);

  const [formAberto, setFormAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Payable | null>(null);
  const [detalheId, setDetalheId] = useState<string | null>(null);

  const { data, isLoading, isError } = usePayables({
    page,
    limit: 10,
    status: status || undefined,
    categoria: categoria || undefined,
    search: search || undefined,
    vencidas: somenteVencidas || undefined,
  });
  const { data: resumo } = usePayableSummary();

  const aoFiltrar = (fn: () => void) => {
    fn();
    setPage(1);
  };

  const abrirNova = () => {
    setEmEdicao(null);
    setFormAberto(true);
  };

  const abrirEdicao = (conta: Payable) => {
    setEmEdicao(conta);
    setFormAberto(true);
  };

  const columns: Column<Payable>[] = [
    {
      header: 'Descrição',
      cell: (c) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{c.descricao}</p>
          <p className="truncate text-xs text-muted-foreground">
            {CATEGORIA_LABEL[c.categoria]}
            {c.fornecedorNome ? ` · ${c.fornecedorNome}` : ''}
          </p>
        </div>
      ),
    },
    {
      header: 'Vencimento',
      cell: (c) => {
        const prazo = rotuloPrazo(c.diasParaVencer);
        return (
          <div>
            <p className="tabular">{formatVencimento(c.vencimento)}</p>
            {prazo && (
              <p
                className={cn(
                  'text-xs',
                  c.vencida ? 'font-semibold text-destructive' : 'text-muted-foreground',
                )}
              >
                {prazo}
              </p>
            )}
          </div>
        );
      },
    },
    {
      header: 'Valor',
      cell: (c) => <span className="tabular">{formatCurrency(c.valorOriginal)}</span>,
    },
    {
      header: 'Saldo',
      cell: (c) => (
        <span className={cn('tabular font-medium', c.saldo > 0 && 'text-destructive')}>
          {formatCurrency(c.saldo)}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (c) => (
        <Badge variant={STATUS_BADGE[c.status].variant}>{STATUS_BADGE[c.status].label}</Badge>
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
            onClick={() => setDetalheId(c.id)}
            title="Ver / pagar"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => abrirEdicao(c)}
            title={
              c.status === 'PAGA' || c.status === 'CANCELADA'
                ? 'Conta encerrada não pode ser editada'
                : 'Editar'
            }
            disabled={c.status === 'PAGA' || c.status === 'CANCELADA'}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contas a pagar"
        description="Despesas, vencimentos e o que já foi quitado"
        action={
          <Button onClick={abrirNova}>
            <Plus className="h-4 w-4" /> Nova conta
          </Button>
        }
      />

      {/* Os três números que decidem o dia */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total em aberto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="tabular text-2xl font-bold">
              {formatCurrency(resumo?.totalEmAberto ?? 0)}
            </p>
          </CardContent>
        </Card>

        <Card
          className={cn(
            'cursor-pointer transition-shadow hover:shadow-lift',
            somenteVencidas && 'ring-2 ring-destructive/40',
          )}
          onClick={() => aoFiltrar(() => setSomenteVencidas((v) => !v))}
          title="Filtrar apenas as vencidas"
        >
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <AlertTriangle className="h-4 w-4" /> Vencidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="tabular text-2xl font-bold text-destructive">
              {formatCurrency(resumo?.totalVencido ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground">
              {resumo?.quantidadeVencidas ?? 0} conta(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CalendarClock className="h-4 w-4" /> Próximos 7 dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="tabular text-2xl font-bold text-warn">
              {formatCurrency(resumo?.totalAVencer7Dias ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground">
              {resumo?.quantidadeAVencer7Dias ?? 0} conta(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Wallet className="h-4 w-4" /> Pago no mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="tabular text-2xl font-bold text-ok">
              {formatCurrency(resumo?.pagoNoMes ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Para onde vai o dinheiro */}
      {resumo && resumo.porCategoria.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Em aberto por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {resumo.porCategoria.map((c) => (
                <button
                  key={c.categoria}
                  type="button"
                  onClick={() =>
                    aoFiltrar(() =>
                      setCategoria((atual) => (atual === c.categoria ? '' : c.categoria)),
                    )
                  }
                  className={cn(
                    'rounded-xl2 border px-3 py-2 text-left text-sm transition-colors hover:bg-accent',
                    categoria === c.categoria && 'border-primary bg-primary/5',
                  )}
                >
                  <p className="font-medium">{CATEGORIA_LABEL[c.categoria]}</p>
                  <p className="tabular text-xs text-muted-foreground">
                    {formatCurrency(c.total)} · {c.quantidade} conta(s)
                  </p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Buscar por descrição..."
            className="w-full sm:w-64"
            value={search}
            onChange={(e) => aoFiltrar(() => setSearch(e.target.value))}
          />
          <div className="w-44">
            <Select
              value={status}
              onChange={(e) => aoFiltrar(() => setStatus(e.target.value as StatusContaPagar | ''))}
            >
              <option value="">Todos os status</option>
              <option value="ABERTA">Aberta</option>
              <option value="PARCIAL">Parcial</option>
              <option value="PAGA">Paga</option>
              <option value="CANCELADA">Cancelada</option>
            </Select>
          </div>
          <div className="w-52">
            <Select
              value={categoria}
              onChange={(e) =>
                aoFiltrar(() => setCategoria(e.target.value as CategoriaDespesa | ''))
              }
            >
              <option value="">Todas as categorias</option>
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>
                  {CATEGORIA_LABEL[c]}
                </option>
              ))}
            </Select>
          </div>
          {somenteVencidas && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => aoFiltrar(() => setSomenteVencidas(false))}
            >
              Limpar filtro de vencidas
            </Button>
          )}
        </div>

        <DataTable
          columns={columns}
          data={data?.data}
          isLoading={isLoading}
          isError={isError}
          getRowKey={(c) => c.id}
          emptyMessage="Nenhuma conta encontrada."
          page={data?.page}
          totalPages={data?.totalPages}
          total={data?.total}
          onPageChange={setPage}
        />
      </div>

      <PayableFormDialog open={formAberto} onOpenChange={setFormAberto} payable={emEdicao} />
      <PayableDetailDialog
        payableId={detalheId}
        onOpenChange={(aberto) => !aberto && setDetalheId(null)}
      />
    </div>
  );
}
