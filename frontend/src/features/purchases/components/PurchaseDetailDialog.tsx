import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { usePurchase } from '../api/use-purchases';

interface Props {
  purchaseId: string | null;
  onOpenChange: (open: boolean) => void;
}

export function PurchaseDetailDialog({ purchaseId, onOpenChange }: Props) {
  const { data, isLoading } = usePurchase(purchaseId);

  return (
    <Dialog open={Boolean(purchaseId)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalhe da compra</DialogTitle>
          <DialogDescription>
            {data ? `${data.fornecedorNome} · ${formatDateTime(data.data)}` : 'Carregando...'}
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {data && (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Qtd.</TableHead>
                  <TableHead className="text-right">Preço unit.</TableHead>
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
            <div className="flex items-center justify-between border-t pt-3 text-lg font-semibold">
              <span>Total</span>
              <span>{formatCurrency(data.valorTotal)}</span>
            </div>
            {data.observacoes && (
              <p className="text-sm text-muted-foreground">Obs.: {data.observacoes}</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
