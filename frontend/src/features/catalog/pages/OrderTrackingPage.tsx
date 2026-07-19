import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2,
  Circle,
  Loader2,
  MessageCircleWarning,
  Package,
  PackageCheck,
  Truck,
} from 'lucide-react';
import { cn, formatCurrency, formatDateTime } from '@/lib/utils';
import { getOrderStatus, type StatusPedido } from '../api/catalog.api';

const ETAPAS: { status: StatusPedido; label: string; icon: typeof Package }[] = [
  { status: 'RECEBIDO', label: 'Pedido recebido', icon: MessageCircleWarning },
  { status: 'EM_SEPARACAO', label: 'Em separação', icon: Package },
  { status: 'SAIU_PARA_ENTREGA', label: 'Saiu para entrega', icon: Truck },
  { status: 'ENTREGUE', label: 'Entregue', icon: PackageCheck },
];

export function OrderTrackingPage() {
  const { trackingToken } = useParams<{ trackingToken: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['catalogo', 'pedido', trackingToken],
    queryFn: () => getOrderStatus(trackingToken as string),
    enabled: Boolean(trackingToken),
    refetchInterval: 10_000,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <MessageCircleWarning className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Não encontramos esse pedido.</p>
        <Link to="/catalogo" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
          Voltar ao catálogo
        </Link>
      </div>
    );
  }

  const cancelado = data.status === 'CANCELADO';
  const etapaAtualIndex = ETAPAS.findIndex((e) => e.status === data.status);

  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-background px-4 py-6">
      <div className="mb-6 text-center">
        <p className="text-sm text-muted-foreground">Pedido</p>
        <h1 className="text-2xl font-bold">#{data.numero}</h1>
        <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(data.criadoEm)}</p>
      </div>

      {cancelado ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-center text-sm font-medium text-destructive">
          Este pedido foi cancelado.
        </div>
      ) : (
        <ol className="mb-6 space-y-0">
          {ETAPAS.map((etapa, index) => {
            const Icon = etapa.icon;
            const concluida = index < etapaAtualIndex;
            const atual = index === etapaAtualIndex;
            const pendente = index > etapaAtualIndex;

            return (
              <li key={etapa.status} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2',
                      concluida && 'border-primary bg-primary text-primary-foreground',
                      atual && 'border-primary bg-primary/10 text-primary',
                      pendente && 'border-muted text-muted-foreground',
                    )}
                  >
                    {concluida ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : atual ? (
                      <Icon className="h-4 w-4" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </div>
                  {index < ETAPAS.length - 1 && (
                    <div className={cn('h-10 w-0.5', concluida ? 'bg-primary' : 'bg-muted')} />
                  )}
                </div>
                <div className={cn('pb-8 pt-1.5 text-sm', pendente && 'text-muted-foreground')}>
                  <p className={cn('font-medium', atual && 'text-primary')}>{etapa.label}</p>
                  {atual && <p className="text-xs text-muted-foreground">Acompanhe por aqui, atualiza sozinho</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div className="rounded-lg border bg-card">
        <div className="divide-y">
          {data.itens.map((item, index) => (
            <div key={index} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-muted-foreground">
                {item.quantidade}x {item.nomeProduto}
              </span>
              <span className="font-medium">{formatCurrency(item.subtotal)}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t px-4 py-3 text-base font-semibold">
          <span>Total</span>
          <span>{formatCurrency(data.total)}</span>
        </div>
      </div>

      <Link
        to="/catalogo"
        className="mt-6 block text-center text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        Voltar ao catálogo
      </Link>
    </div>
  );
}
