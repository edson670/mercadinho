import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Banknote, CreditCard, Loader2, QrCode, ShoppingBag, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn, formatCurrency, generateId } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/api-client';
import { toast } from '@/stores/toast.store';
import { useCartStore } from '../store/cart.store';
import { useCatalogSessionStore } from '../store/session.store';
import { createOrder, type FormaPagamentoPedido } from '../api/catalog.api';

const schema = z
  .object({
    nome: z.string().min(2, 'Informe seu nome').max(120),
    telefone: z
      .string()
      .min(10, 'Telefone inválido')
      .max(13, 'Telefone inválido')
      .regex(/^\d+$/, 'Use apenas números'),
    logradouro: z.string().min(2, 'Informe a rua').max(200),
    numeroEndereco: z.string().min(1, 'Informe o número').max(20),
    complemento: z.string().max(100).optional().or(z.literal('')),
    bairro: z.string().min(2, 'Informe o bairro').max(100),
    cidade: z.string().min(2, 'Informe a cidade').max(100),
    referencia: z.string().max(200).optional().or(z.literal('')),
    formaPagamento: z.enum(['PIX', 'DINHEIRO', 'CARTAO_CREDITO', 'CARTAO_DEBITO']),
    trocoPara: z.string().optional(),
    observacoes: z.string().max(500).optional().or(z.literal('')),
  })
  .refine(
    (data) => data.formaPagamento !== 'DINHEIRO' || (data.trocoPara && Number(data.trocoPara) > 0),
    { message: 'Informe o valor para troco', path: ['trocoPara'] },
  );

type FormValues = z.infer<typeof schema>;

const PAGAMENTOS: { value: FormaPagamentoPedido; label: string; icon: typeof QrCode }[] = [
  { value: 'PIX', label: 'Pix', icon: QrCode },
  { value: 'DINHEIRO', label: 'Dinheiro', icon: Banknote },
  { value: 'CARTAO_CREDITO', label: 'Cartão de crédito', icon: CreditCard },
  { value: 'CARTAO_DEBITO', label: 'Cartão de débito', icon: CreditCard },
];

export function CheckoutPage() {
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const total = useCartStore((s) => s.total());
  const clearCart = useCartStore((s) => s.clear);
  const session = useCatalogSessionStore();
  const [idempotencyKey] = useState(() => generateId());
  const pedidoConfirmadoRef = useRef(false);

  useEffect(() => {
    if (items.length === 0 && !pedidoConfirmadoRef.current) navigate('/catalogo', { replace: true });
  }, [items.length, navigate]);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: session.nome ?? '',
      telefone: session.telefone ?? '',
      formaPagamento: 'PIX',
    },
  });

  const formaPagamento = watch('formaPagamento');

  const mutation = useMutation({
    mutationFn: createOrder,
    onSuccess: (data) => {
      pedidoConfirmadoRef.current = true;
      clearCart();
      navigate(`/catalogo/pedido/${data.trackingToken}`, { replace: true });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });

  const onSubmit = (values: FormValues) => {
    mutation.mutate({
      nome: values.nome,
      telefone: values.telefone,
      sessionToken: session.token ?? '',
      logradouro: values.logradouro,
      numeroEndereco: values.numeroEndereco,
      complemento: values.complemento || undefined,
      bairro: values.bairro,
      cidade: values.cidade,
      referencia: values.referencia || undefined,
      formaPagamento: values.formaPagamento,
      trocoPara: values.formaPagamento === 'DINHEIRO' ? Number(values.trocoPara) : undefined,
      observacoes: values.observacoes || undefined,
      idempotencyKey,
      itens: items.map((i) => ({ produtoId: i.produtoId, quantidade: i.quantidade })),
    });
  };

  const resumo = useMemo(
    () => items.map((i) => `${i.quantidade}x ${i.nome}`).join(', '),
    [items],
  );

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-background px-4 py-3">
        <button
          type="button"
          onClick={() => navigate('/catalogo')}
          className="rounded-full p-1.5 hover:bg-accent"
          aria-label="Voltar ao catálogo"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold">Finalizar pedido</h1>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-2xl space-y-6 p-4">
        {/* O pedido exige a sessão do link do WhatsApp. Avisar aqui em cima
            evita a pior versão disto: preencher o formulário inteiro e só
            descobrir no envio. */}
        {!session.token && (
          <section className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-400">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Para fazer o pedido, use o link que enviamos no WhatsApp. Mande uma mensagem
              para a loja e você receberá um link novo.
            </span>
          </section>
        )}

        <section className="rounded-lg border bg-card p-3 text-sm text-muted-foreground">
          <p className="mb-1 flex items-center gap-1.5 font-medium text-foreground">
            <ShoppingBag className="h-4 w-4" /> Resumo
          </p>
          <p className="line-clamp-2">{resumo}</p>
          <p className="mt-1 text-base font-semibold text-foreground">{formatCurrency(total)}</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Seus dados</h2>
          <div>
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" {...register('nome')} />
            {errors.nome && <p className="mt-1 text-xs text-destructive">{errors.nome.message}</p>}
          </div>
          <div>
            <Label htmlFor="telefone">Telefone (WhatsApp)</Label>
            {/* Somente leitura quando veio do link: o backend confere este
                número contra o da sessão, então deixar editável só produziria
                um erro na hora de enviar. */}
            <Input
              id="telefone"
              inputMode="numeric"
              placeholder="11999998888"
              readOnly={Boolean(session.telefone)}
              className={cn(session.telefone && 'bg-muted text-muted-foreground')}
              {...register('telefone')}
            />
            {errors.telefone && <p className="mt-1 text-xs text-destructive">{errors.telefone.message}</p>}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Endereço de entrega</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label htmlFor="logradouro">Rua</Label>
              <Input id="logradouro" {...register('logradouro')} />
              {errors.logradouro && <p className="mt-1 text-xs text-destructive">{errors.logradouro.message}</p>}
            </div>
            <div>
              <Label htmlFor="numeroEndereco">Número</Label>
              <Input id="numeroEndereco" {...register('numeroEndereco')} />
              {errors.numeroEndereco && (
                <p className="mt-1 text-xs text-destructive">{errors.numeroEndereco.message}</p>
              )}
            </div>
          </div>
          <div>
            <Label htmlFor="complemento">Complemento (opcional)</Label>
            <Input id="complemento" placeholder="Apto, bloco..." {...register('complemento')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="bairro">Bairro</Label>
              <Input id="bairro" {...register('bairro')} />
              {errors.bairro && <p className="mt-1 text-xs text-destructive">{errors.bairro.message}</p>}
            </div>
            <div>
              <Label htmlFor="cidade">Cidade</Label>
              <Input id="cidade" {...register('cidade')} />
              {errors.cidade && <p className="mt-1 text-xs text-destructive">{errors.cidade.message}</p>}
            </div>
          </div>
          <div>
            <Label htmlFor="referencia">Ponto de referência (opcional)</Label>
            <Input id="referencia" placeholder="Perto de..." {...register('referencia')} />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Pagamento</h2>
          <Controller
            control={control}
            name="formaPagamento"
            render={({ field }) => (
              <div className="grid grid-cols-2 gap-2">
                {PAGAMENTOS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => field.onChange(value)}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors',
                      field.value === value
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border text-muted-foreground hover:bg-accent',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            )}
          />
          {formaPagamento === 'DINHEIRO' && (
            <div>
              <Label htmlFor="trocoPara">Troco para quanto?</Label>
              <Input id="trocoPara" inputMode="decimal" placeholder="Ex.: 50" {...register('trocoPara')} />
              {errors.trocoPara && <p className="mt-1 text-xs text-destructive">{errors.trocoPara.message}</p>}
            </div>
          )}
        </section>

        <section>
          <Label htmlFor="observacoes">Observações (opcional)</Label>
          <Textarea id="observacoes" placeholder="Ex.: sem cebola, entregar após 18h..." {...register('observacoes')} />
        </section>

        <div className="fixed inset-x-0 bottom-0 mx-auto max-w-2xl border-t bg-background p-4">
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={mutation.isPending || !session.token}
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              `Confirmar pedido · ${formatCurrency(total)}`
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
