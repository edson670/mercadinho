import { useEffect, useState } from 'react';
import { Ban, CalendarDays, Loader2, Repeat } from 'lucide-react';
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
import { useCancelPayable, usePayPayable, usePayable } from '../api/use-payables';
import { CATEGORIA_LABEL } from '../api/payables.api';
import { STATUS_BADGE } from './status-badge';
import { formatVencimento, rotuloPrazo } from '../lib/vencimento';

interface Props {
  payableId: string | null;
  onOpenChange: (open: boolean) => void;
}

export function PayableDetailDialog({ payableId, onOpenChange }: Props) {
  const { data, isLoading } = usePayable(payableId);
  const payMutation = usePayPayable();
  const cancelMutation = useCancelPayable();

  const [valor, setValor] = useState('');
  const [forma, setForma] = useState<FormaPagamento>('PIX');
  const [observacoes, setObservacoes] = useState('');
  const [confirmandoCancelamento, setConfirmandoCancelamento] = useState(false);

  useEffect(() => {
    setValor('');
    setForma('PIX');
    setObservacoes('');
    setConfirmandoCancelamento(false);
  }, [payableId]);

  const encerrada = data?.status === 'PAGA' || data?.status === 'CANCELADA';

  const handlePay = async () => {
    if (!data) return;
    const v = Number(valor);
    if (!Number.isFinite(v) || v <= 0) return toast.error('Informe um valor válido.');
    if (v > data.saldo + 0.005) return toast.error('Valor maior que o saldo devedor.');
    await payMutation.mutateAsync({
      id: data.id,
      valor: v,
      formaPagamento: forma,
      observacoes: observacoes || undefined,
    });
    setValor('');
    setObservacoes('');
  };

  const handleCancel = async (futuras: boolean) => {
    if (!data) return;
    await cancelMutation.mutateAsync({ id: data.id, futuras });
    onOpenChange(false);
  };

  const prazo = data ? rotuloPrazo(data.diasParaVencer) : null;

  return (
    <Dialog open={Boolean(payableId)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{data?.descricao ?? 'Conta a pagar'}</DialogTitle>
          <DialogDescription>
            {data
              ? `${CATEGORIA_LABEL[data.categoria]}${data.fornecedorNome ? ` · ${data.fornecedorNome}` : ''}`
              : 'Detalhe da conta'}
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {data && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 rounded-card border bg-raised p-3 text-center text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Valor</p>
                <p className="tabular font-semibold">{formatCurrency(data.valorOriginal)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pago</p>
                <p className="tabular font-semibold text-ok">{formatCurrency(data.valorPago)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Saldo</p>
                <p className="tabular font-semibold text-destructive">
                  {formatCurrency(data.saldo)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant={STATUS_BADGE[data.status].variant}>
                {STATUS_BADGE[data.status].label}
              </Badge>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatVencimento(data.vencimento)}
                {prazo && (
                  <span className={data.vencida ? 'font-semibold text-destructive' : ''}>
                    · {prazo}
                  </span>
                )}
              </span>
              {data.grupoRecorrencia && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Repeat className="h-3.5 w-3.5" /> parcela de uma série mensal
                </span>
              )}
            </div>

            {data.observacoes && (
              <p className="rounded-xl2 bg-raised p-3 text-sm text-muted-foreground">
                {data.observacoes}
              </p>
            )}

            {/* Registrar pagamento */}
            {!encerrada && (
              <div className="space-y-2 rounded-card border p-3">
                <Label className="text-sm font-medium">Registrar pagamento</Label>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label htmlFor="valorPagamento" className="text-xs">
                      Valor (R$)
                    </Label>
                    <Input
                      id="valorPagamento"
                      type="number"
                      step="0.01"
                      min="0"
                      value={valor}
                      onChange={(e) => setValor(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="formaPagamento" className="text-xs">
                      Forma
                    </Label>
                    <Select
                      id="formaPagamento"
                      value={forma}
                      onChange={(e) => setForma(e.target.value as FormaPagamento)}
                    >
                      <option value="PIX">PIX</option>
                      <option value="DINHEIRO">Dinheiro</option>
                      <option value="CARTAO">Cartão</option>
                    </Select>
                  </div>
                  <Button onClick={handlePay} disabled={payMutation.isPending}>
                    {payMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Pagar
                  </Button>
                </div>
                <Input
                  placeholder="Observação do pagamento (opcional)"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                />
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => setValor(String(data.saldo))}
                >
                  Quitar total ({formatCurrency(data.saldo)})
                </button>
              </div>
            )}

            {/* Histórico */}
            <div>
              <p className="mb-2 text-sm font-medium">Pagamentos</p>
              {data.pagamentos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum pagamento registrado.</p>
              ) : (
                <div className="divide-y">
                  {data.pagamentos.map((p) => (
                    <div key={p.id} className="py-2 text-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="tabular font-medium">{formatCurrency(p.valor)}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {p.formaPagamento}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(p.data)}
                        </span>
                      </div>
                      {(p.observacoes || p.usuarioNome) && (
                        <p className="text-xs text-muted-foreground">
                          {[p.usuarioNome, p.observacoes].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cancelamento — destrutivo, então pede confirmação explícita */}
            {!encerrada && (
              <div className="border-t pt-3">
                {!confirmandoCancelamento ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => setConfirmandoCancelamento(true)}
                  >
                    <Ban className="h-4 w-4" /> Cancelar conta
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm">
                      Cancelar esta conta? Ela sai do total devido, mas continua no histórico.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={cancelMutation.isPending}
                        onClick={() => handleCancel(false)}
                      >
                        Cancelar só esta
                      </Button>
                      {data.grupoRecorrencia && (
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={cancelMutation.isPending}
                          onClick={() => handleCancel(true)}
                        >
                          Esta e as futuras da série
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmandoCancelamento(false)}
                      >
                        Voltar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
