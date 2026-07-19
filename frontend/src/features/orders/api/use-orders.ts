import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/stores/toast.store';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  cancelOrder,
  getOrder,
  listOrders,
  updateOrderStatus,
  type OrderListParams,
  type StatusPedido,
} from './orders.api';

const KEY = 'whatsapp-orders';

/** Ativos = ainda não finalizados (aparecem na tela e contam no badge). */
const STATUS_ATIVOS: StatusPedido[] = ['RECEBIDO', 'EM_SEPARACAO', 'SAIU_PARA_ENTREGA'];

export function useOrders(params: OrderListParams) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => listOrders(params),
    // Sem Socket.IO ainda (W4) — polling é o "tempo real" desta etapa.
    refetchInterval: 10_000,
  });
}

export function useOrder(id: string | null) {
  return useQuery({
    queryKey: [KEY, 'detail', id],
    queryFn: () => getOrder(id!),
    enabled: Boolean(id),
  });
}

/** Contagem de pedidos ativos para o selo de destaque na navegação. */
export function useActiveOrdersCount() {
  return useQuery({
    queryKey: [KEY, 'count-ativos'],
    queryFn: async () => {
      const res = await listOrders({ status: 'RECEBIDO', limit: 1 });
      return res.total;
    },
    refetchInterval: 15_000,
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: StatusPedido }) => updateOrderStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success('Status do pedido atualizado.');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
}

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelOrder(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['stock'] });
      toast.success('Pedido cancelado e estoque estornado.');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
}

export { STATUS_ATIVOS };
