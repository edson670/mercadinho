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
import { toast } from '@/stores/toast.store';
import { useCashMovement } from '../api/use-cash-register';
import type { TipoMovimentacaoCaixa } from '../api/cash-register.api';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caixaId: string;
  tipo: TipoMovimentacaoCaixa;
}

export function CashMovementDialog({ open, onOpenChange, caixaId, tipo }: Props) {
  const [valor, setValor] = useState('');
  const [motivo, setMotivo] = useState('');
  const mutation = useCashMovement();

  useEffect(() => {
    if (open) {
      setValor('');
      setMotivo('');
    }
  }, [open]);

  const isSangria = tipo === 'SANGRIA';

  const handleSubmit = async () => {
    const v = Number(valor);
    if (!Number.isFinite(v) || v <= 0) return toast.error('Informe um valor válido.');
    if (motivo.trim().length < 3) return toast.error('Descreva o motivo.');
    await mutation.mutateAsync({ id: caixaId, tipo, valor: v, motivo });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isSangria ? 'Sangria (retirada)' : 'Suprimento (reforço)'}</DialogTitle>
          <DialogDescription>
            {isSangria
              ? 'Retirada de dinheiro do caixa.'
              : 'Entrada de dinheiro no caixa (troco/reforço).'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="valor">Valor (R$)</Label>
            <Input
              id="valor"
              type="number"
              step="0.01"
              min="0"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo</Label>
            <Input id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
