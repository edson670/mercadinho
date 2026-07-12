import { Link } from 'react-router-dom';
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  HandCoins,
  AlertTriangle,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { useSummary } from '../api/use-dashboard';
import { SalesChart } from '../components/SalesChart';
import { TopProductsChart } from '../components/TopProductsChart';

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const isGestao = user?.role === 'ADMINISTRADOR' || user?.role === 'GERENTE';
  const { data: s } = useSummary();

  const kpis = [
    { label: 'Vendas do dia', value: formatCurrency(s?.vendasDia ?? 0), icon: ShoppingCart, hint: `${s?.qtdVendasDia ?? 0} vendas` },
    { label: 'Vendas do mês', value: formatCurrency(s?.vendasMes ?? 0), icon: TrendingUp, hint: `${s?.qtdVendasMes ?? 0} vendas` },
    { label: 'Total faturado', value: formatCurrency(s?.totalFaturado ?? 0), icon: DollarSign, hint: 'acumulado' },
    { label: 'Fiado em aberto', value: formatCurrency(s?.fiadoEmAberto ?? 0), icon: HandCoins, hint: `${s?.clientesInadimplentes ?? 0} clientes` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Olá, {user?.nome?.split(' ')[0] ?? 'usuário'} 👋
        </h1>
        <p className="text-muted-foreground">Visão geral do seu mercadinho</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon, hint }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{value}</div>
              <p className="text-xs text-muted-foreground">{hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Indicadores secundários */}
      <div className="grid gap-4 sm:grid-cols-3">
        <MiniStat
          icon={CheckCircle2}
          label="Recebido em fiado"
          value={formatCurrency(s?.totalRecebidoFiado ?? 0)}
          tone="emerald"
        />
        <MiniStat
          icon={Users}
          label="Inadimplentes"
          value={String(s?.clientesInadimplentes ?? 0)}
          tone="amber"
          to="/fiado"
        />
        <MiniStat
          icon={AlertTriangle}
          label="Estoque baixo"
          value={String(s?.produtosEstoqueBaixo ?? 0)}
          tone="amber"
          to="/estoque"
        />
      </div>

      {/* Gráficos (apenas gestão) */}
      {isGestao && (
        <div className="grid gap-4 lg:grid-cols-2">
          <SalesChart />
          <TopProductsChart />
        </div>
      )}

      {/* Últimas vendas */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Últimas vendas</CardTitle>
        </CardHeader>
        <CardContent>
          {!s || s.ultimasVendas.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhuma venda registrada ainda.
            </p>
          ) : (
            <div className="divide-y">
              {s.ultimasVendas.map((v) => (
                <div key={v.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">#{v.numero}</span>
                    <span className="text-muted-foreground">{v.clienteNome ?? 'Consumidor'}</span>
                    <Badge variant="secondary">{v.formaPagamento}</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{formatCurrency(v.total)}</span>
                    <span className="text-xs text-muted-foreground">{formatDateTime(v.data)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  tone,
  to,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  tone: 'emerald' | 'amber';
  to?: string;
}) {
  const toneClass = tone === 'emerald' ? 'text-emerald-600' : 'text-amber-600';
  const content = (
    <Card className={to ? 'transition-colors hover:bg-accent/50' : ''}>
      <CardContent className="flex items-center gap-3 py-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-muted ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}
