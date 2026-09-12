import { Loader2, Ban, Printer } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { useSale, useCancelSale } from '../api/use-sales';
import { SaleReceipt, useComprovante } from './SaleReceipt';

interface Props {
  saleId: string | null;
  onOpenChange: (open: boolean) => void;
}

export function SaleDetailDialog({ saleId, onOpenChange }: Props) {
  const { data, isLoading } = useSale(saleId);
  const cancelMutation = useCancelSale();
  const { venda: comprovante, imprimir, carregando: imprimindo } = useComprovante();
  const role = useAuthStore((s) => s.user?.role);
  const canCancel = role === 'ADMINISTRADOR' || role === 'GERENTE';

  const handleCancel = async () => {
    if (!data) return;
    await cancelMutation.mutateAsync(data.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={Boolean(saleId)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {data ? `Venda #${data.numero}` : 'Detalhe da venda'}
          </DialogTitle>
          <DialogDescription>
            {data ? `${formatDateTime(data.data)} · ${data.usuarioNome ?? ''}` : 'Carregando...'}
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {data && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{data.formaPagamento}</Badge>
              <Badge variant={data.status === 'CONCLUIDA' ? 'success' : 'destructive'}>
                {data.status === 'CONCLUIDA' ? 'Concluída' : 'Cancelada'}
              </Badge>
              {data.clienteNome && <Badge variant="outline">{data.clienteNome}</Badge>}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Qtd.</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.itens.map((i) => (
                  <TableRow key={i.produtoId}>
                    <TableCell className="font-medium">{i.produtoNome}</TableCell>
                    <TableCell className="text-right">{i.quantidade}</TableCell>
                    <TableCell className="text-right">{formatCurrency(i.precoUnitario)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(i.subtotal)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="space-y-1 border-t pt-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(data.subtotal)}</span>
              </div>
              {data.desconto > 0 && (
                <div className="flex justify-between text-amber-600">
                  <span>Desconto</span>
                  <span>- {formatCurrency(data.desconto)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{formatCurrency(data.total)}</span>
              </div>
            </div>
          </div>
        )}

        {data && (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => imprimir(data.id)}
              disabled={imprimindo}
            >
              {imprimindo ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Printer className="h-4 w-4" />
              )}
              Reimprimir comprovante
            </Button>
            {data.status === 'CONCLUIDA' && canCancel && (
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Ban className="h-4 w-4" />
                )}
                Cancelar venda
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
      {comprovante && <SaleReceipt venda={comprovante} />}
    </Dialog>
  );
}
