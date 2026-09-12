import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2,
  Banknote,
  QrCode,
  CreditCard,
  HandCoins,
  History,
  AlertTriangle,
  MessageCircle,
  CircleCheck,
  Printer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';
import { ProductGrid } from '../components/ProductGrid';
import { CartList } from '../components/CartList';
import { SaleReceipt, useComprovante } from '../components/SaleReceipt';
import { CustomerSearchSelect } from '@/features/customers/components/CustomerSearchSelect';
import { useCurrentCash } from '@/features/cash-register/api/use-cash-register';
import { useActiveOrdersCount } from '@/features/orders/api/use-orders';
import { usePdvCart } from '@/stores/pdv-cart.store';
import { formatCurrency, formatDateTime, cn } from '@/lib/utils';
import { toast } from '@/stores/toast.store';
import type { Customer } from '@/features/customers/api/customers.api';
import type { FormaPagamento } from '../api/sales.api';
import { useCreateSale } from '../api/use-sales';

const paymentOptions: {
  value: FormaPagamento;
  label: string;
  icon: typeof Banknote;
  atalho: string;
}[] = [
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
  // A manipulação de quantidade/remoção mora no CartList, que é quem desenha
  // as linhas — aqui só interessa o que compõe o total.
  const { items, desconto, setDesconto, clear, subtotal, total } = usePdvCart();
  // `isPending` importa: enquanto a consulta não responde, `caixa` é
  // undefined e o alerta de "nenhum caixa aberto" aparecia por um instante
  // mesmo com o caixa aberto — o operador via um aviso falso a cada carga da
  // tela e, se clicasse em "Abrir caixa", tomava "você já possui um caixa".
  const { data: caixa, isPending: caixaCarregando } = useCurrentCash();
  const { data: pedidosNovos } = useActiveOrdersCount();
  const createSale = useCreateSale();

  const [pagamento, setPagamento] = useState<FormaPagamento>('DINHEIRO');
  const [cliente, setCliente] = useState<Customer | null>(null);
  const { venda: comprovante, imprimir } = useComprovante();
  // Preferência do balcão: nem toda loja entrega cupom em toda venda.
  const [imprimirAoFinalizar, setImprimirAoFinalizar] = useState(
    () => localStorage.getItem('mercado-pdv-imprimir') !== 'nao',
  );

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
      // A venda já está gravada: uma falha ao imprimir não pode desfazê-la
      // nem travar o próximo atendimento — no pior caso o operador
      // reimprime pelo histórico.
      if (imprimirAoFinalizar) {
        imprimir(result.id).catch(() => toast.error('Não foi possível abrir a impressão.'));
      }
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
        // Enter só finaliza com o foco FORA de um campo. Um leitor de código de
        // barras digita o código e manda Enter: se o atalho valesse dentro da
        // busca, a venda fecharia antes de o produto entrar no carrinho. Vale
        // igual para desconto e quantidade — Enter ali é "confirmei o que
        // digitei", não "encerrei a venda".
        const alvo = document.activeElement;
        if (
          alvo instanceof HTMLInputElement ||
          alvo instanceof HTMLTextAreaElement ||
          alvo instanceof HTMLSelectElement ||
          (alvo instanceof HTMLElement && alvo.isContentEditable)
        ) {
          return;
        }
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
            {pedidosNovos} {pedidosNovos === 1 ? 'pedido novo' : 'pedidos novos'} pelo WhatsApp
            aguardando separação.
          </span>
          <Button
            size="sm"
            variant="destructive"
            className="ml-auto"
            onClick={() => navigate('/pedidos-whatsapp')}
          >
            Ver pedidos
          </Button>
        </div>
      )}

      {!caixa && !caixaCarregando && (
        <div className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4" />
          Nenhum caixa aberto. Abra o caixa antes de finalizar vendas.
          <Button
            size="sm"
            variant="outline"
            className="ml-auto"
            onClick={() => navigate('/caixa')}
          >
            Abrir caixa
          </Button>
        </div>
      )}

      {caixa && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
          <CircleCheck className="h-4 w-4" />
          Caixa aberto {caixa.usuarioNome ? `por ${caixa.usuarioNome} ` : ''}desde{' '}
          {formatDateTime(caixa.abertoEm)} · Abertura: {formatCurrency(caixa.valorAbertura)}
        </div>
      )}

      {/* Três painéis: produtos, a lista que o leitor alimenta e o total.
          A lista saiu de baixo da grade para ficar colada no total — é onde
          o olho do operador precisa estar durante o atendimento. */}
      <div className="grid gap-4 md:grid-cols-12">
        {/* Produtos */}
        <div className="md:col-span-12 xl:col-span-5">
          <Card>
            <CardContent className="pt-6">
              <ProductGrid />
            </CardContent>
          </Card>
        </div>

        {/* Lista lida pelo leitor */}
        <div className="md:col-span-7 xl:col-span-4">
          <div className="md:sticky md:top-4">
            <CartList className="md:max-h-[calc(100vh-2rem)]" />
          </div>
        </div>

        {/* Total + pagamento */}
        <div className="md:col-span-5 xl:col-span-3">
          <Card className="sticky top-4">
            <CardContent className="space-y-4 pt-6">
              {/* O número que o operador e o cliente olham. Bloco cheio e
                  grande de propósito: era uma linha discreta no meio do
                  resumo, com o mesmo peso do subtotal. */}
              <div className="rounded-card bg-gradient-to-br from-primary to-primary-hover p-4 text-primary-foreground shadow-glow">
                <p className="text-[11px] font-bold uppercase tracking-[.14em] opacity-80">
                  Total a pagar
                </p>
                <p className="tabular mt-1 text-[38px] font-extrabold leading-none tracking-[-.02em]">
                  {formatCurrency(tot)}
                </p>
                <p className="mt-2 text-[11.5px] font-medium opacity-80">
                  {items.length === 0
                    ? 'Nenhum item'
                    : `${items.length} ${items.length === 1 ? 'produto' : 'produtos'} · subtotal ${formatCurrency(sub)}`}
                  {desconto > 0 && ` · desconto −${formatCurrency(desconto)}`}
                </p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="desconto" className="text-xs">
                  Desconto (R$)
                </Label>
                {/* Limitado ao subtotal na própria digitação: o backend
                    recusa desconto maior que o subtotal, e sem o limite a
                    tela mostrava Total R$ 0,00 e só acusava o erro no clique
                    de finalizar. */}
                <Input
                  id="desconto"
                  type="number"
                  step="0.01"
                  min="0"
                  max={sub}
                  value={desconto || ''}
                  onChange={(e) => setDesconto(Math.min(Number(e.target.value) || 0, sub))}
                />
                {desconto >= sub && sub > 0 && (
                  <p className="text-xs text-muted-foreground">Desconto limitado ao subtotal.</p>
                )}
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
              <label className="flex cursor-pointer items-center justify-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 accent-primary"
                  checked={imprimirAoFinalizar}
                  onChange={(e) => {
                    setImprimirAoFinalizar(e.target.checked);
                    localStorage.setItem('mercado-pdv-imprimir', e.target.checked ? 'sim' : 'nao');
                  }}
                />
                <Printer className="h-3.5 w-3.5" />
                Imprimir comprovante ao finalizar
              </label>

              {items.length > 0 && (
                <Button variant="ghost" className="w-full" onClick={clear}>
                  Limpar
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {comprovante && <SaleReceipt venda={comprovante} />}
    </div>
  );
}
