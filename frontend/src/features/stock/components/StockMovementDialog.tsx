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
import { ProductSearchSelect } from '@/features/products/components/ProductSearchSelect';
import type { Product } from '@/features/products/api/products.api';
import { toast } from '@/stores/toast.store';
import { useStockEntry, useStockAdjustment } from '../api/use-stock';

type Mode = 'entry' | 'adjust';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
}

export function StockMovementDialog({ open, onOpenChange, mode }: Props) {
  const [product, setProduct] = useState<Product | null>(null);
  const [quantidade, setQuantidade] = useState('');
  const [motivo, setMotivo] = useState('');

  const entryMutation = useStockEntry();
  const adjustMutation = useStockAdjustment();
  const pending = entryMutation.isPending || adjustMutation.isPending;

  useEffect(() => {
    if (open) {
      setProduct(null);
      setQuantidade('');
      setMotivo('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!product) return toast.error('Selecione um produto.');
    const qtd = Number(quantidade);
    if (!Number.isFinite(qtd) || qtd < 0) return toast.error('Quantidade inválida.');

    if (mode === 'entry') {
      if (qtd <= 0) return toast.error('Informe uma quantidade maior que zero.');
      await entryMutation.mutateAsync({ produtoId: product.id, quantidade: qtd, motivo: motivo || undefined });
    } else {
      if (!motivo.trim()) return toast.error('Informe o motivo do ajuste.');
      await adjustMutation.mutateAsync({ produtoId: product.id, novaQuantidade: qtd, motivo });
    }
    onOpenChange(false);
  };

  const isEntry = mode === 'entry';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEntry ? 'Entrada de estoque' : 'Ajuste de estoque'}</DialogTitle>
          <DialogDescription>
            {isEntry
              ? 'Adiciona quantidade ao saldo do produto.'
              : 'Define a quantidade absoluta em estoque (correção de inventário).'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Produto</Label>
            <ProductSearchSelect value={product} onSelect={setProduct} />
          </div>

          {product && (
            <p className="text-sm text-muted-foreground">
              Saldo atual: <span className="font-medium text-foreground">{product.estoque} {product.unidade}</span>
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="qtd">{isEntry ? 'Quantidade a adicionar' : 'Nova quantidade'}</Label>
            <Input
              id="qtd"
              type="number"
              step="0.001"
              min="0"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo {isEntry ? '(opcional)' : ''}</Label>
            <Input id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
