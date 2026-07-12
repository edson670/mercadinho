import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';
import { useCloseCash } from '../api/use-cash-register';
import type { CashRegister } from '../api/cash-register.api';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caixa: CashRegister;
}

export function CloseCashDialog({ open, onOpenChange, caixa }: Props) {
  const [valorFechamento, setValorFechamento] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const mutation = useCloseCash();

  useEffect(() => {
    if (open) {
      setValorFechamento('');
      setObservacoes('');
    }
  }, [open]);

  const contado = Number(valorFechamento);
  const diferenca = valorFechamento !== '' ? contado - caixa.totais.saldoEsperado : null;

  const handleSubmit = async () => {
    await mutation.mutateAsync({
      id: caixa.id,
      valorFechamento: valorFechamento !== '' ? contado : undefined,
      observacoes: observacoes || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Fechar caixa</DialogTitle>
          <DialogDescription>Confira os valores antes de fechar.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Saldo esperado em dinheiro</span>
              <span className="font-semibold">{formatCurrency(caixa.totais.saldoEsperado)}</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="contado">Valor contado (R$)</Label>
            <Input
              id="contado"
              type="number"
              step="0.01"
              min="0"
              value={valorFechamento}
              onChange={(e) => setValorFechamento(e.target.value)}
            />
          </div>
          {diferenca !== null && (
            <p
              className={`text-sm ${
                Math.abs(diferenca) < 0.005
                  ? 'text-emerald-600'
                  : diferenca > 0
                    ? 'text-amber-600'
                    : 'text-destructive'
              }`}
            >
              Diferença: {formatCurrency(diferenca)}{' '}
              {Math.abs(diferenca) < 0.005 ? '(caixa confere)' : diferenca > 0 ? '(sobra)' : '(falta)'}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="obs">Observações (opcional)</Label>
            <Input id="obs" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Fechar caixa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
