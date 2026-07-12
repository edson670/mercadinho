import { useState } from 'react';
import {
  Wallet,
  Loader2,
  ArrowDownCircle,
  ArrowUpCircle,
  Lock,
  DoorOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { toast } from '@/stores/toast.store';
import { useCurrentCash, useOpenCash } from '../api/use-cash-register';
import { CashMovementDialog } from '../components/CashMovementDialog';
import { CloseCashDialog } from '../components/CloseCashDialog';
import type { TipoMovimentacaoCaixa } from '../api/cash-register.api';

export function CashRegisterPage() {
  const { data: caixa, isLoading } = useCurrentCash();
  const openMutation = useOpenCash();
  const [valorAbertura, setValorAbertura] = useState('');
  const [movDialog, setMovDialog] = useState<null | TipoMovimentacaoCaixa>(null);
  const [closeOpen, setCloseOpen] = useState(false);

  const handleOpen = async () => {
    const v = Number(valorAbertura || 0);
    if (!Number.isFinite(v) || v < 0) return toast.error('Valor inválido.');
    await openMutation.mutateAsync(v);
    setValorAbertura('');
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Caixa" description="Controle diário do caixa" />

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Sem caixa aberto → abrir */}
      {!isLoading && !caixa && (
        <Card className="mx-auto max-w-md">
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <DoorOpen className="h-7 w-7" />
            </div>
            <CardTitle>Caixa fechado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Abra o caixa para começar a registrar vendas.
            </p>
            <div className="space-y-2">
              <Label htmlFor="abertura">Valor de abertura (R$)</Label>
              <Input
                id="abertura"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={valorAbertura}
                onChange={(e) => setValorAbertura(e.target.value)}
              />
            </div>
            <Button className="w-full" onClick={handleOpen} disabled={openMutation.isPending}>
              {openMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Abrir caixa
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Caixa aberto → painel */}
      {!isLoading && caixa && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Caixa aberto</span>
                  <Badge variant="success">Aberto</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Desde {formatDateTime(caixa.abertoEm)} · {caixa.usuarioNome}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setMovDialog('SUPRIMENTO')}>
                <ArrowUpCircle className="h-4 w-4" /> Suprimento
              </Button>
              <Button variant="outline" onClick={() => setMovDialog('SANGRIA')}>
                <ArrowDownCircle className="h-4 w-4" /> Sangria
              </Button>
              <Button variant="destructive" onClick={() => setCloseOpen(true)}>
                <Lock className="h-4 w-4" /> Fechar caixa
              </Button>
            </div>
          </div>

          {/* Totais */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Abertura" value={caixa.valorAbertura} />
            <Stat label="Vendas (dinheiro)" value={caixa.totais.vendasDinheiro} />
            <Stat label="Suprimentos" value={caixa.totais.totalSuprimentos} />
            <Stat label="Sangrias" value={caixa.totais.totalSangrias} negative />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Saldo esperado em dinheiro</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{formatCurrency(caixa.totais.saldoEsperado)}</p>
              <p className="text-sm text-muted-foreground">
                Total de vendas no caixa: {formatCurrency(caixa.totais.totalVendas)}
              </p>
            </CardContent>
          </Card>

          {/* Movimentações */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Movimentações do caixa</CardTitle>
            </CardHeader>
            <CardContent>
              {caixa.movimentacoes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma sangria ou suprimento.</p>
              ) : (
                <div className="divide-y">
                  {caixa.movimentacoes.map((m) => (
                    <div key={m.id} className="flex items-center justify-between py-2 text-sm">
                      <div className="flex items-center gap-2">
                        {m.tipo === 'SANGRIA' ? (
                          <ArrowDownCircle className="h-4 w-4 text-amber-600" />
                        ) : (
                          <ArrowUpCircle className="h-4 w-4 text-emerald-600" />
                        )}
                        <span>{m.motivo}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={m.tipo === 'SANGRIA' ? 'text-amber-600' : 'text-emerald-600'}>
                          {m.tipo === 'SANGRIA' ? '-' : '+'}
                          {formatCurrency(m.valor)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(m.criadoEm)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <CashMovementDialog
            open={movDialog !== null}
            onOpenChange={(o) => !o && setMovDialog(null)}
            caixaId={caixa.id}
            tipo={movDialog ?? 'SANGRIA'}
          />
          <CloseCashDialog open={closeOpen} onOpenChange={setCloseOpen} caixa={caixa} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, negative }: { label: string; value: number; negative?: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-xl font-bold ${negative && value > 0 ? 'text-amber-600' : ''}`}>
          {negative && value > 0 ? '-' : ''}
          {formatCurrency(value)}
        </p>
      </CardContent>
    </Card>
  );
}
