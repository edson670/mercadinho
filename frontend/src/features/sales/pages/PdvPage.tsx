import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trash2,
  Minus,
  Plus,
  ShoppingCart,
  Loader2,
  Banknote,
  QrCode,
  CreditCard,
  HandCoins,
  History,
  AlertTriangle,
  MessageCircle,
  CircleCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';
import { ProductSearchSelect } from '@/features/products/components/ProductSearchSelect';
import { CustomerSearchSelect } from '@/features/customers/components/CustomerSearchSelect';
import { useCurrentCash } from '@/features/cash-register/api/use-cash-register';
import { useActiveOrdersCount } from '@/features/orders/api/use-orders';
import { usePdvCart } from '@/stores/pdv-cart.store';
import { formatCurrency, formatDateTime, cn } from '@/lib/utils';
import { toast } from '@/stores/toast.store';
import type { Customer } from '@/features/customers/api/customers.api';
import type { FormaPagamento } from '../api/sales.api';
import { useCreateSale } from '../api/use-sales';

const paymentOptions: { value: FormaPagamento; label: string; icon: typeof Banknote; atalho: string }[] = [
  { value: 'DINHEIRO', label: 'Dinheiro', icon: Banknote, atalho: 'Shift+2' },
  { value: 'PIX', label: 'PIX', icon: QrCode, atalho: 'Shift+3' },
  { value: 'CARTAO', label: 'Cartão', icon: CreditCard, atalho: 'Shift+1' },
  { value: 'FIADO', label: 'Fiado', icon: HandCoins, atalho: 'Shift+4' },
];

/**
 * `event.code` do dígito (não muda com Shift, ao contrário de `event.key` —
 * que vira "!", "@" etc.) → forma de pagamento correspondente.
 */
const ATALHO_PAGAMENTO: Record<string, FormaPagamento> = {
  Digit1: 'CARTAO',
  Digit2: 'DINHEIRO',
  Digit3: 'PIX',
  Digit4: 'FIADO',
};

export function PdvPage() {
  const navigate = useNavigate();
  const { items, addItem, setQty, removeItem, desconto, setDesconto, clear, subtotal, total } =
    usePdvCart();
  const { data: caixa } = useCurrentCash();
  const { data: pedidosNovos } = useActiveOrdersCount();
  const createSale = useCreateSale();

  const [pagamento, setPagamento] = useState<FormaPagamento>('DINHEIRO');
  const [cliente, setCliente] = useState<Customer | null>(null);

  const sub = subtotal();
  const tot = total();

  const handleFinalize = async () => {
    if (items.length === 0) return toast.error('Adicione produtos à venda.');
    if (pagamento === 'FIADO' && !cliente) return toast.error('Selecione o cliente para o fiado.');

    const result = await createSale.mutateAsync({
      clienteId: pagamento === 'FIADO' ? cliente!.id : undefined,
      formaPagamento: pagamento,
      desconto: desconto > 0 ? desconto : undefined,
      itens: items.map((i) => ({ produtoId: i.product.id, quantidade: i.quantidade })),
    });
    if (result?.id) {
      toast.success(`Venda finalizada — ${formatCurrency(tot)}`);
      clear();
      setCliente(null);
      setPagamento('DINHEIRO');
    }
  };

  // Atalhos de teclado: Enter finaliza a venda, Shift+1..4 troca a forma de pagamento.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.shiftKey && ATALHO_PAGAMENTO[e.code]) {
        e.preventDefault();
        setPagamento(ATALHO_PAGAMENTO[e.code]);
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
        if (document.activeElement instanceof HTMLTextAreaElement) return;
        if (createSale.isPending || items.length === 0) return;
        e.preventDefault();
        handleFinalize();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="PDV — Ponto de Venda"
        description="Venda rápida"
        action={
          <Button variant="outline" onClick={() => navigate('/vendas/historico')}>
            <History className="h-4 w-4" /> Histórico
          </Button>
        }
      />

      {Boolean(pedidosNovos) && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/5 px-4 py-3 text-sm">
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-destructive" />
          </span>
          <MessageCircle className="h-4 w-4 text-destructive" />
          <span className="text-destructive">
            {pedidosNovos} {pedidosNovos === 1 ? 'pedido novo' : 'pedidos novos'} pelo WhatsApp aguardando separação.
          </span>
          <Button size="sm" variant="destructive" className="ml-auto" onClick={() => navigate('/pedidos-whatsapp')}>
            Ver pedidos
          </Button>
        </div>
      )}

      {!caixa && (
        <div className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4" />
          Nenhum caixa aberto. Abra o caixa antes de finalizar vendas.
          <Button size="sm" variant="outline" className="ml-auto" onClick={() => navigate('/caixa')}>
            Abrir caixa
          </Button>
        </div>
      )}

      {caixa && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
          <CircleCheck className="h-4 w-4" />
          Caixa aberto {caixa.usuarioNome ? `por ${caixa.usuarioNome} ` : ''}desde {formatDateTime(caixa.abertoEm)} ·
          Abertura: {formatCurrency(caixa.valorAbertura)}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Busca + carrinho */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardContent className="pt-6">
              <ProductSearchSelect
                value={null}
                onSelect={(p) => p && addItem(p)}
                placeholder="Buscar produto por nome ou código de barras..."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingCart className="h-4 w-4" /> Itens ({items.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum item. Busque um produto para começar.
                </p>
              ) : (
                <div className="divide-y">
                  {items.map((item) => (
                    <div key={item.product.id} className="flex items-center gap-3 py-3">
                      <div className="flex-1">
                        <p className="font-medium">{item.product.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(item.product.precoVenda)} · {item.product.unidade}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setQty(item.product.id, item.quantidade - 1)}
                          disabled={item.quantidade <= 1}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          className="h-8 w-16 text-center"
                          type="number"
                          step="0.001"
                          value={item.quantidade}
                          onChange={(e) => setQty(item.product.id, Number(e.target.value) || 1)}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setQty(item.product.id, item.quantidade + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="w-24 text-right font-medium">
                        {formatCurrency(item.product.precoVenda * item.quantidade)}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => removeItem(item.product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Resumo + pagamento */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-base">Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(sub)}</span>
              </div>
              <div className="space-y-1">
                <Label htmlFor="desconto" className="text-xs">Desconto (R$)</Label>
                <Input
                  id="desconto"
                  type="number"
                  step="0.01"
                  min="0"
                  value={desconto || ''}
                  onChange={(e) => setDesconto(Number(e.target.value) || 0)}
                />
              </div>
              <div className="flex items-center justify-between rounded-md bg-primary/5 px-3 py-3">
                <span className="text-sm font-medium text-muted-foreground">Total</span>
                <span className="text-2xl font-bold text-primary">{formatCurrency(tot)}</span>
              </div>

              {/* Forma de pagamento */}
              <div className="space-y-2">
                <Label className="text-xs">Forma de pagamento</Label>
                <div className="grid grid-cols-2 gap-2">
                  {paymentOptions.map(({ value, label, icon: Icon, atalho }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPagamento(value)}
                      className={cn(
                        'flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
                        pagamento === value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'hover:bg-accent',
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4" /> {label}
                      </span>
                      <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {atalho}
                      </kbd>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cliente (fiado) */}
              {pagamento === 'FIADO' && (
                <div className="space-y-2">
                  <Label className="text-xs">Cliente</Label>
                  <CustomerSearchSelect value={cliente} onSelect={setCliente} />
                </div>
              )}

              <Button
                className="w-full"
                size="lg"
                onClick={handleFinalize}
                disabled={createSale.isPending || items.length === 0}
              >
                {createSale.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Finalizar venda
                <kbd className="rounded border border-primary-foreground/30 bg-primary-foreground/10 px-1.5 py-0.5 font-mono text-[10px]">
                  Enter
                </kbd>
              </Button>
              {items.length > 0 && (
                <Button variant="ghost" className="w-full" onClick={clear}>
                  Limpar
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
