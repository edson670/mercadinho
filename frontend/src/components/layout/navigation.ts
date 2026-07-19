import {
  LayoutDashboard,
  Users,
  UserCircle,
  Package,
  Tags,
  Boxes,
  Truck,
  ShoppingCart,
  MessageCircle,
  ScrollText,
  HandCoins,
  Wallet,
  BarChart3,
  ShieldCheck,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '@/types';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  roles: Role[]; // perfis que enxergam o item
  /** Mostra a contagem de pedidos WhatsApp ativos ao lado do item (ver Sidebar). */
  liveOrdersBadge?: boolean;
}

const ALL: Role[] = ['ADMINISTRADOR', 'GERENTE', 'CAIXA'];
const GESTAO: Role[] = ['ADMINISTRADOR', 'GERENTE'];
const ADMIN: Role[] = ['ADMINISTRADOR'];

export const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard, roles: ALL },
  { label: 'PDV / Vendas', to: '/vendas', icon: ShoppingCart, roles: ALL },
  {
    label: 'Pedidos WhatsApp',
    to: '/pedidos-whatsapp',
    icon: MessageCircle,
    roles: ALL,
    liveOrdersBadge: true,
  },
  { label: 'Fiado', to: '/fiado', icon: HandCoins, roles: ALL },
  { label: 'Caixa', to: '/caixa', icon: Wallet, roles: ALL },
  { label: 'Clientes', to: '/clientes', icon: UserCircle, roles: ALL },
  { label: 'Produtos', to: '/produtos', icon: Package, roles: ALL },
  { label: 'Categorias', to: '/categorias', icon: Tags, roles: GESTAO },
  { label: 'Estoque', to: '/estoque', icon: Boxes, roles: GESTAO },
  { label: 'Fornecedores', to: '/fornecedores', icon: Truck, roles: GESTAO },
  { label: 'Compras', to: '/compras', icon: ScrollText, roles: GESTAO },
  { label: 'Relatórios', to: '/relatorios', icon: BarChart3, roles: GESTAO },
  { label: 'Usuários', to: '/usuarios', icon: Users, roles: ADMIN },
  { label: 'Auditoria', to: '/auditoria', icon: ShieldCheck, roles: GESTAO },
  { label: 'Configurações', to: '/configuracoes', icon: Settings, roles: ADMIN },
];

export function visibleNavItems(role: Role | undefined): NavItem[] {
  if (!role) return [];
  return navItems.filter((item) => item.roles.includes(role));
}
