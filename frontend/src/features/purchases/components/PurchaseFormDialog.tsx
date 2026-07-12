import { useState, useEffect } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
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
import { Select } from '@/components/ui/select';
import { ProductSearchSelect } from '@/features/products/components/ProductSearchSelect';
import { useSuppliers } from '@/features/suppliers/api/use-suppliers';
import type { Product } from '@/features/products/api/products.api';
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/stores/toast.store';
import { useCreatePurchase } from '../api/use-purchases';

interface Item {
  product: Product;
  quantidade: number;
  precoUnitario: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PurchaseFormDialog({ open, onOpenChange }: Props) {
  const { data: suppliers } = useSuppliers({ page: 1, limit: 100 });
  const createMutation = useCreatePurchase();

  const [fornecedorId, setFornecedorId] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [picked, setPicked] = useState<Product | null>(null);
  const [qtd, setQtd] = useState('1');
  const [preco, setPreco] = useState('');

  useEffect(() => {
    if (open) {
      setFornecedorId('');
      setObservacoes('');
      setItems([]);
      setPicked(null);
      setQtd('1');
      setPreco('');
    }
  }, [open]);

  const addItem = () => {
    if (!picked) return toast.error('Selecione um produto.');
    const q = Number(qtd);
    const p = Number(preco);
    if (!Number.isFinite(q) || q <= 0) return toast.error('Quantidade inválida.');
    if (!Number.isFinite(p) || p < 0) return toast.error('Preço inválido.');
    if (items.some((i) => i.product.id === picked.id)) {
      return toast.error('Produto já adicionado.');
    }
    setItems((prev) => [...prev, { product: picked, quantidade: q, precoUnitario: p }]);
    setPicked(null);
    setQtd('1');
    setPreco('');
  };

  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.product.id !== id));

  const total = items.reduce((acc, i) => acc + i.quantidade * i.precoUnitario, 0);

  const handleSubmit = async () => {
    if (!fornecedorId) return toast.error('Selecione o fornecedor.');
    if (items.length === 0) return toast.error('Adicione ao menos um item.');
    await createMutation.mutateAsync({
      fornecedorId,
      observacoes: observacoes || undefined,
      itens: items.map((i) => ({
        produtoId: i.product.id,
        quantidade: i.quantidade,
        precoUnitario: i.precoUnitario,
      })),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova compra</DialogTitle>
          <DialogDescription>Registre uma compra — o estoque será atualizado automaticamente.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fornecedor">Fornecedor</Label>
            <Select id="fornecedor" value={fornecedorId} onChange={(e) => setFornecedorId(e.target.value)}>
              <option value="">Selecione...</option>
              {suppliers?.data.filter((s) => s.ativo).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </Select>
          </div>

          {/* Adicionar item */}
          <div className="rounded-md border p-3">
            <Label className="mb-2 block">Adicionar item</Label>
            <ProductSearchSelect value={picked} onSelect={setPicked} />
            <div className="mt-2 flex items-end gap-2">
              <div className="flex-1">
                <Label htmlFor="qtd" className="text-xs">Quantidade</Label>
                <Input id="qtd" type="number" step="0.001" min="0" value={qtd} onChange={(e) => setQtd(e.target.value)} />
              </div>
              <div className="flex-1">
                <Label htmlFor="preco" className="text-xs">Preço unit. (R$)</Label>
                <Input id="preco" type="number" step="0.01" min="0" value={preco} onChange={(e) => setPreco(e.target.value)} />
              </div>
              <Button type="button" variant="secondary" onClick={addItem}>
                <Plus className="h-4 w-4" /> Adicionar
              </Button>
            </div>
          </div>

          {/* Itens adicionados */}
          {items.length > 0 && (
            <div className="space-y-1 rounded-md border">
              {items.map((i) => (
                <div key={i.product.id} className="flex items-center justify-between border-b px-3 py-2 text-sm last:border-0">
                  <span className="flex-1">
                    <span className="font-medium">{i.product.nome}</span>
                    <span className="ml-2 text-muted-foreground">
                      {i.quantidade} × {formatCurrency(i.precoUnitario)}
                    </span>
                  </span>
                  <span className="mr-3 font-medium">{formatCurrency(i.quantidade * i.precoUnitario)}</span>
                  <button type="button" onClick={() => removeItem(i.product.id)} className="text-destructive hover:opacity-70">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <div className="flex items-center justify-between px-3 py-2 font-semibold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
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
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Registrar compra
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
