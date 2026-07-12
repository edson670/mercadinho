import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Select } from '@/components/ui/select';
import { useAllCategories } from '@/features/categories/api/use-categories';
import { useCreateProduct, useUpdateProduct } from '../api/use-products';
import { productFormSchema, unidadeLabels, type ProductFormValues } from '../schemas/product.schema';
import type { Product } from '../api/products.api';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
}

export function ProductFormDialog({ open, onOpenChange, product }: Props) {
  const isEdit = Boolean(product);
  const { data: categorias } = useAllCategories();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      nome: '',
      codigoBarras: '',
      categoriaId: '',
      precoCompra: 0,
      precoVenda: 0,
      estoque: 0,
      estoqueMinimo: 0,
      unidade: 'UN',
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        nome: product?.nome ?? '',
        codigoBarras: product?.codigoBarras ?? '',
        categoriaId: product?.categoriaId ?? '',
        precoCompra: product?.precoCompra ?? 0,
        precoVenda: product?.precoVenda ?? 0,
        estoque: product?.estoque ?? 0,
        estoqueMinimo: product?.estoqueMinimo ?? 0,
        unidade: product?.unidade ?? 'UN',
      });
    }
  }, [open, product, reset]);

  const onSubmit = async (values: ProductFormValues) => {
    const base = {
      nome: values.nome,
      codigoBarras: values.codigoBarras || undefined,
      categoriaId: values.categoriaId,
      precoCompra: values.precoCompra,
      precoVenda: values.precoVenda,
      estoqueMinimo: values.estoqueMinimo,
      unidade: values.unidade,
    };
    if (isEdit && product) {
      await updateMutation.mutateAsync({ id: product.id, payload: base });
    } else {
      await createMutation.mutateAsync({ ...base, estoque: values.estoque ?? 0 });
    }
    onOpenChange(false);
  };

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar produto' : 'Novo produto'}</DialogTitle>
          <DialogDescription>Cadastro de produto do mercadinho.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" {...register('nome')} />
              {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="codigoBarras">Código de barras</Label>
              <Input id="codigoBarras" {...register('codigoBarras')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoriaId">Categoria</Label>
              <Select id="categoriaId" {...register('categoriaId')}>
                <option value="">Selecione...</option>
                {categorias?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </Select>
              {errors.categoriaId && (
                <p className="text-xs text-destructive">{errors.categoriaId.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="precoCompra">Preço de compra (R$)</Label>
              <Input id="precoCompra" type="number" step="0.01" {...register('precoCompra')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="precoVenda">Preço de venda (R$)</Label>
              <Input id="precoVenda" type="number" step="0.01" {...register('precoVenda')} />
              {errors.precoVenda && (
                <p className="text-xs text-destructive">{errors.precoVenda.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="unidade">Unidade</Label>
              <Select id="unidade" {...register('unidade')}>
                {Object.entries(unidadeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="estoqueMinimo">Estoque mínimo</Label>
              <Input id="estoqueMinimo" type="number" step="0.001" {...register('estoqueMinimo')} />
            </div>
            {!isEdit && (
              <div className="space-y-2">
                <Label htmlFor="estoque">Estoque inicial</Label>
                <Input id="estoque" type="number" step="0.001" {...register('estoque')} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
