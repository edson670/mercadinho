import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDateTime } from '@/lib/utils';
import { useAuditDetail } from '../api/use-audit';

interface Props {
  auditId: string | null;
  onOpenChange: (open: boolean) => void;
}

export function AuditDetailDialog({ auditId, onOpenChange }: Props) {
  const { data, isLoading } = useAuditDetail(auditId);

  return (
    <Dialog open={Boolean(auditId)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{data?.acao ?? 'Detalhe da ação'}</DialogTitle>
          <DialogDescription>
            {data
              ? `${data.usuarioNome ?? 'Sistema'} · ${formatDateTime(data.criadoEm)} · IP ${data.ip ?? '—'}`
              : 'Carregando...'}
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {data && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Requisição (entrada)</p>
              <pre className="max-h-72 overflow-auto rounded-md border bg-muted/40 p-3 text-xs">
                {JSON.stringify(data.dadosAntes ?? {}, null, 2)}
              </pre>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Resposta (resultado)</p>
              <pre className="max-h-72 overflow-auto rounded-md border bg-muted/40 p-3 text-xs">
                {JSON.stringify(data.dadosDepois ?? {}, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
