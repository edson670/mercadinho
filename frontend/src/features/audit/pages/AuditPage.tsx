import { useState } from 'react';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { formatDateTime } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import { useAuditList } from '../api/use-audit';
import { AuditDetailDialog } from '../components/AuditDetailDialog';
import type { AuditListItem } from '../api/audit.api';

function methodFromAcao(acao: string): string {
  return acao.split(' ')[0] ?? '';
}

const methodVariant: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  POST: 'success',
  PATCH: 'warning',
  PUT: 'warning',
  DELETE: 'destructive',
};

export function AuditPage() {
  const [page, setPage] = useState(1);
  const [entidade, setEntidade] = useState('');
  const debounced = useDebounce(entidade, 400);
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data, isLoading, isError } = useAuditList({
    page,
    limit: 15,
    entidade: debounced || undefined,
  });

  const columns: Column<AuditListItem>[] = [
    {
      header: 'Ação',
      cell: (a) => (
        <div className="flex items-center gap-2">
          <Badge variant={methodVariant[methodFromAcao(a.acao)] ?? 'secondary'}>
            {methodFromAcao(a.acao)}
          </Badge>
          <span className="text-sm text-muted-foreground">{a.acao.split(' ').slice(1).join(' ')}</span>
        </div>
      ),
    },
    { header: 'Módulo', cell: (a) => <Badge variant="outline">{a.entidade}</Badge> },
    { header: 'Usuário', cell: (a) => a.usuarioNome ?? <span className="text-muted-foreground">Sistema</span> },
    { header: 'IP', cell: (a) => <span className="text-muted-foreground">{a.ip ?? '—'}</span> },
    { header: 'Data', cell: (a) => <span className="text-muted-foreground">{formatDateTime(a.criadoEm)}</span> },
    {
      header: 'Detalhe',
      className: 'text-right',
      cell: (a) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="icon" onClick={() => setDetailId(a.id)}>
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Auditoria" description="Trilha de ações realizadas no sistema" />

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          <div className="w-56 space-y-1">
            <Label htmlFor="entidade" className="text-xs">Módulo (ex.: products, sales)</Label>
            <Input
              id="entidade"
              placeholder="Filtrar por módulo..."
              value={entidade}
              onChange={(e) => {
                setEntidade(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={data?.data}
        isLoading={isLoading}
        isError={isError}
        getRowKey={(a) => a.id}
        emptyMessage="Nenhum registro de auditoria."
        page={data?.page}
        totalPages={data?.totalPages}
        total={data?.total}
        onPageChange={setPage}
      />

      <AuditDetailDialog auditId={detailId} onOpenChange={(o) => !o && setDetailId(null)} />
    </div>
  );
}
