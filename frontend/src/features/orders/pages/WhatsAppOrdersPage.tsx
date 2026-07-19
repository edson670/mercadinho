import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Loader2, MessageCircle, Clock, Package, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';
import { cn, formatCurrency, formatDateTime } from '@/lib/utils';
import { useOrders } from '../api/use-orders';
import { OrderDetailDialog } from '../components/OrderDetailDialog';
import type { OrderListItem, StatusPedido } from '../api/orders.api';

interface ColumnConfig {
  status: StatusPedido;
  label: string;
  icon: typeof Clock;
  highlight?: boolean;
}

const COLUNAS: ColumnConfig[] = [
  { status: 'RECEBIDO', label: 'Recebidos', icon: MessageCircle, highlight: true },
  { status: 'EM_SEPARACAO', label: 'Em separação', icon: Package },
  { status: 'SAIU_PARA_ENTREGA', label: 'Saiu para entrega', icon: Truck },
];

export function WhatsAppOrdersPage() {
  const navigate = useNavigate();
  const [detailId, setDetailId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pedidos WhatsApp"
        description="Pedidos recebidos pelo catálogo — atualiza automaticamente"
        action={
          <Button variant="outline" onClick={() => navigate('/pedidos-whatsapp/historico')}>
            <History className="h-4 w-4" /> Histórico
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {COLUNAS.map((col) => (
          <OrderColumn key={col.status} config={col} onSelect={setDetailId} />
        ))}
      </div>

      <OrderDetailDialog orderId={detailId} onOpenChange={(o) => !o && setDetailId(null)} />
    </div>
  );
}

function OrderColumn({
  config,
  onSelect,
}: {
  config: ColumnConfig;
  onSelect: (id: string) => void;
}) {
  const { data, isLoading } = useOrders({ status: config.status, limit: 30 });
  const Icon = config.icon;
  const temPedidos = (data?.total ?? 0) > 0;
  const destacar = config.highlight && temPedidos;

  return (
    <Card className={cn(destacar && 'border-destructive shadow-md shadow-destructive/20')}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            {destacar ? (
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-destructive" />
              </span>
            ) : (
              <Icon className="h-4 w-4 text-muted-foreground" />
            )}
            {config.label}
          </span>
          <Badge variant={destacar ? 'destructive' : 'secondary'}>{data?.total ?? 0}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {!isLoading && data?.data.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhum pedido aqui.</p>
        )}
        {data?.data.map((pedido) => (
          <OrderCard key={pedido.id} pedido={pedido} onClick={() => onSelect(pedido.id)} />
        ))}
      </CardContent>
    </Card>
  );
}

function OrderCard({ pedido, onClick }: { pedido: OrderListItem; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-md border bg-card p-3 text-left text-sm transition-colors hover:bg-accent"
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold">#{pedido.numero} · {pedido.nomeCliente}</span>
        <span className="font-medium">{formatCurrency(pedido.total)}</span>
      </div>
      <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>{pedido.bairro} · {pedido.itensCount} item(ns)</span>
        <span>{formatDateTime(pedido.criadoEm)}</span>
      </div>
    </button>
  );
}
