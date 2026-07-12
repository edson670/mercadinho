import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { toast } from '@/stores/toast.store';
import type { FormaPagamento } from '@/features/sales/api/sales.api';
import { useCredit, useRegisterPayment } from '../api/use-credit';
import type { StatusFiado } from '../api/credit.api';

const statusBadge: Record<StatusFiado, { label: string; variant: 'success' | 'warning' | 'destructive' }> = {
  ABERTO: { label: 'Aberto', variant: 'destructive' },
  PARCIAL: { label: 'Parcial', variant: 'warning' },
  QUITADO: { label: 'Quitado', variant: 'success' },
};

interface Props {
  fiadoId: string | null;
  onOpenChange: (open: boolean) => void;
}

export function CreditDetailDialog({ fiadoId, onOpenChange }: Props) {
  const { data, isLoading } = useCredit(fiadoId);
  const payMutation = useRegisterPayment();
  const [valor, setValor] = useState('');
  const [forma, setForma] = useState<FormaPagamento>('DINHEIRO');

  useEffect(() => {
    setValor('');
    setForma('DINHEIRO');
  }, [fiadoId]);

  const handlePay = async () => {
    if (!data) return;
    const v = Number(valor);
    if (!Number.isFinite(v) || v <= 0) return toast.error('Informe um valor válido.');
    if (v > data.saldo + 0.005) return toast.error('Valor maior que o saldo devedor.');
    await payMutation.mutateAsync({ id: data.id, valor: v, formaPagamento: forma });
    setValor('');
  };

  const quitado = data?.status === 'QUITADO';

  return (
    <Dialog open={Boolean(fiadoId)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Fiado {data ? `— ${data.clienteNome}` : ''}</DialogTitle>
          <DialogDescription>
            {data?.vendaNumero ? `Origem: venda #${data.vendaNumero}` : 'Detalhe do crédito'}
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {data && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 rounded-md border bg-muted/40 p-3 text-center text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Original</p>
                <p className="font-semibold">{formatCurrency(data.valorOriginal)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pago</p>
                <p className="font-semibold text-emerald-600">{formatCurrency(data.valorPago)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Saldo</p>
                <p className="font-semibold text-destructive">{formatCurrency(data.saldo)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Badge variant={statusBadge[data.status].variant}>{statusBadge[data.status].label}</Badge>
            </div>

            {/* Registrar pagamento */}
            {!quitado && (
              <div className="space-y-2 rounded-md border p-3">
                <Label className="text-sm font-medium">Registrar pagamento</Label>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label htmlFor="valor" className="text-xs">Valor (R$)</Label>
                    <Input
                      id="valor"
                      type="number"
                      step="0.01"
                      min="0"
                      value={valor}
                      onChange={(e) => setValor(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="forma" className="text-xs">Forma</Label>
                    <Select id="forma" value={forma} onChange={(e) => setForma(e.target.value as FormaPagamento)}>
                      <option value="DINHEIRO">Dinheiro</option>
                      <option value="PIX">PIX</option>
                      <option value="CARTAO">Cartão</option>
                    </Select>
                  </div>
                  <Button onClick={handlePay} disabled={payMutation.isPending}>
                    {payMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Pagar
                  </Button>
                </div>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => setValor(String(data.saldo))}
                >
                  Quitar total ({formatCurrency(data.saldo)})
                </button>
              </div>
            )}

            {/* Histórico de pagamentos */}
            <div>
              <p className="mb-2 text-sm font-medium">Pagamentos</p>
              {data.pagamentos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum pagamento registrado.</p>
              ) : (
                <div className="divide-y">
                  {data.pagamentos.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-2 text-sm">
                      <div>
                        <span className="font-medium">{formatCurrency(p.valor)}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{p.formaPagamento}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatDateTime(p.data)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
