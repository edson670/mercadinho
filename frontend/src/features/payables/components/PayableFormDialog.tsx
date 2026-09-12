import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Textarea } from '@/components/ui/textarea';
import { useSuppliers } from '@/features/suppliers/api/use-suppliers';
import { useCreatePayable, useUpdatePayable } from '../api/use-payables';
import { CATEGORIAS, CATEGORIA_LABEL, type Payable } from '../api/payables.api';
import { hojeInputDate, paraInputDate } from '../lib/vencimento';

const schema = z.object({
  descricao: z.string().min(2, 'Mínimo de 2 caracteres').max(160),
  categoria: z.enum(CATEGORIAS as [string, ...string[]]),
  fornecedorId: z.string().optional(),
  valor: z.coerce.number().positive('Informe um valor maior que zero'),
  vencimento: z.string().min(10, 'Informe o vencimento'),
  observacoes: z.string().max(500).optional(),
  repetirMeses: z.coerce.number().int().min(1).max(60),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payable?: Payable | null;
}

export function PayableFormDialog({ open, onOpenChange, payable }: Props) {
  const isEdit = Boolean(payable);
  const createMutation = useCreatePayable();
  const updateMutation = useUpdatePayable();
  // Lista curta só para o seletor; fornecedor é opcional na conta.
  const { data: fornecedores } = useSuppliers({ page: 1, limit: 100 });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!open) return;
    reset({
      descricao: payable?.descricao ?? '',
      categoria: payable?.categoria ?? 'OUTROS',
      fornecedorId: payable?.fornecedorId ?? '',
      valor: payable?.valorOriginal ?? ('' as unknown as number),
      vencimento: payable ? paraInputDate(payable.vencimento) : hojeInputDate(),
      observacoes: payable?.observacoes ?? '',
      repetirMeses: 1,
    });
  }, [open, payable, reset]);

  const repetir = Number(watch('repetirMeses')) || 1;

  const onSubmit = async (values: FormValues) => {
    const base = {
      descricao: values.descricao,
      categoria: values.categoria as Payable['categoria'],
      fornecedorId: values.fornecedorId || undefined,
      valor: values.valor,
      vencimento: values.vencimento,
      observacoes: values.observacoes || undefined,
    };

    if (isEdit && payable) {
      await updateMutation.mutateAsync({ id: payable.id, payload: base });
    } else {
      await createMutation.mutateAsync({ ...base, repetirMeses: values.repetirMeses });
    }
    onOpenChange(false);
  };

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar conta' : 'Nova conta a pagar'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Alterar o valor recalcula o saldo a partir do que já foi pago.'
              : 'Despesa com vencimento. Contas mensais podem ser lançadas de uma vez.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Input id="descricao" placeholder="Ex.: Aluguel da loja" {...register('descricao')} />
            {errors.descricao && (
              <p className="text-xs text-destructive">{errors.descricao.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria</Label>
              <Select id="categoria" {...register('categoria')}>
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORIA_LABEL[c]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fornecedorId">Fornecedor (opcional)</Label>
              <Select id="fornecedorId" {...register('fornecedorId')}>
                <option value="">Nenhum</option>
                {fornecedores?.data.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="valor">Valor</Label>
              <Input
                id="valor"
                inputMode="decimal"
                step="0.01"
                type="number"
                placeholder="0,00"
                {...register('valor')}
              />
              {errors.valor && <p className="text-xs text-destructive">{errors.valor.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="vencimento">Vencimento</Label>
              <Input id="vencimento" type="date" {...register('vencimento')} />
              {errors.vencimento && (
                <p className="text-xs text-destructive">{errors.vencimento.message}</p>
              )}
            </div>
          </div>

          {/* Repetição só faz sentido ao criar: editar mexe numa parcela só. */}
          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="repetirMeses">Repetir mensalmente</Label>
              <Select id="repetirMeses" {...register('repetirMeses')}>
                <option value={1}>Não repetir (conta única)</option>
                <option value={3}>3 meses</option>
                <option value={6}>6 meses</option>
                <option value={12}>12 meses</option>
                <option value={24}>24 meses</option>
              </Select>
              {repetir > 1 && (
                <p className="text-xs text-muted-foreground">
                  Serão criadas {repetir} contas, uma por mês. Vencimento no dia 31 cai no último
                  dia dos meses mais curtos.
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea id="observacoes" {...register('observacoes')} />
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
