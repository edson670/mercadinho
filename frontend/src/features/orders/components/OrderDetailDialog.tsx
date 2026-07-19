import { Loader2, MapPin, Ban, ArrowRight } from 'lucide-react';
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
import { useOrder, useUpdateOrderStatus, useCancelOrder } from '../api/use-orders';
import type { StatusPedido } from '../api/orders.api';

const STATUS_LABEL: Record<StatusPedido, string> = {
  RECEBIDO: 'Recebido',
  EM_SEPARACAO: 'Em separação',
  SAIU_PARA_ENTREGA: 'Saiu para entrega',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};

const PROXIMO_STATUS: Partial<Record<StatusPedido, StatusPedido>> = {
  RECEBIDO: 'EM_SEPARACAO',
  EM_SEPARACAO: 'SAIU_PARA_ENTREGA',
  SAIU_PARA_ENTREGA: 'ENTREGUE',
};

const PAGAMENTO_LABEL: Record<string, string> = {
  PIX: 'PIX',
  DINHEIRO: 'Dinheiro',
  CARTAO_CREDITO: 'Cartão de crédito',
  CARTAO_DEBITO: 'Cartão de débito',
};

interface Props {
  orderId: string | null;
  onOpenChange: (open: boolean) => void;
}

export function OrderDetailDialog({ orderId, onOpenChange }: Props) {
  const { data, isLoading } = useOrder(orderId);
  const updateStatus = useUpdateOrderStatus();
  const cancelMutation = useCancelOrder();
  const role = useAuthStore((s) => s.user?.role);
  const canCancel = role === 'ADMINISTRADOR' || role === 'GERENTE';

  const proximo = data ? PROXIMO_STATUS[data.status] : undefined;
  const ativo = data && data.status !== 'ENTREGUE' && data.status !== 'CANCELADO';

  return (
    <Dialog open={Boolean(orderId)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{data ? `Pedido #${data.numero} — ${data.nomeCliente}` : 'Pedido'}</DialogTitle>
          <DialogDescription>
            {data ? `${formatDateTime(data.criadoEm)} · ${data.telefone}` : 'Carregando...'}
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
              <Badge variant={data.status === 'CANCELADO' ? 'destructive' : 'secondary'}>
                {STATUS_LABEL[data.status]}
              </Badge>
              <Badge variant="outline">{PAGAMENTO_LABEL[data.formaPagamento]}</Badge>
              {data.trocoPara && <Badge variant="outline">Troco p/ {formatCurrency(data.trocoPara)}</Badge>}
            </div>

            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <div className="mb-1 flex items-center gap-1 font-medium">
                <MapPin className="h-4 w-4" /> Endereço de entrega
              </div>
              <p>
                {data.endereco.logradouro}, {data.endereco.numero}
                {data.endereco.complemento ? ` — ${data.endereco.complemento}` : ''}
              </p>
              <p>
                {data.endereco.bairro}, {data.endereco.cidade}
              </p>
              {data.endereco.referencia && (
                <p className="text-muted-foreground">Ref.: {data.endereco.referencia}</p>
              )}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Qtd.</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.itens.map((i) => (
                  <TableRow key={i.produtoId}>
                    <TableCell className="font-medium">{i.nomeProduto}</TableCell>
                    <TableCell className="text-right">{i.quantidade}</TableCell>
                    <TableCell className="text-right">{formatCurrency(i.subtotal)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between border-t pt-3 text-lg font-bold">
              <span>Total</span>
              <span>{formatCurrency(data.total)}</span>
            </div>

            {data.observacoes && (
              <p className="text-sm text-muted-foreground">Obs.: {data.observacoes}</p>
            )}
          </div>
        )}

        {data && ativo && (
          <DialogFooter className="gap-2 sm:justify-between">
            {canCancel && (
              <Button
                variant="destructive"
                onClick={() => cancelMutation.mutate(data.id, { onSuccess: () => onOpenChange(false) })}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Ban className="h-4 w-4" />
                )}
                Cancelar pedido
              </Button>
            )}
            {proximo && (
              <Button
                onClick={() => updateStatus.mutate({ id: data.id, status: proximo })}
                disabled={updateStatus.isPending}
              >
                {updateStatus.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                Avançar para {STATUS_LABEL[proximo]}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
