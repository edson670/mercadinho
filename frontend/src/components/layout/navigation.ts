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
  ReceiptText,
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

export interface NavGroup {
  titulo: string;
  itens: NavItem[];
}

/**
 * Agrupado por momento de uso, não por entidade: o caixa passa o dia em
 * "Operação" e raramente desce para o resto. Quinze itens em lista corrida
 * obrigavam a varrer o menu inteiro para achar o de sempre.
 */
export const navGroups: NavGroup[] = [
  {
    titulo: 'Operação',
    itens: [
      { label: 'Dashboard', to: '/', icon: LayoutDashboard, roles: ALL },
      { label: 'PDV / Vendas', to: '/vendas', icon: ShoppingCart, roles: ALL },
      {
        label: 'Pedidos WhatsApp',
        to: '/pedidos-whatsapp',
        icon: MessageCircle,
        roles: ALL,
        liveOrdersBadge: true,
      },
      { label: 'Caixa', to: '/caixa', icon: Wallet, roles: ALL },
    ],
  },
  {
    titulo: 'Clientes',
    itens: [
      { label: 'Fiado', to: '/fiado', icon: HandCoins, roles: ALL },
      { label: 'Clientes', to: '/clientes', icon: UserCircle, roles: ALL },
    ],
  },
  {
    titulo: 'Catálogo',
    itens: [
      { label: 'Produtos', to: '/produtos', icon: Package, roles: ALL },
      { label: 'Categorias', to: '/categorias', icon: Tags, roles: GESTAO },
      { label: 'Estoque', to: '/estoque', icon: Boxes, roles: GESTAO },
    ],
  },
  {
    titulo: 'Suprimentos',
    itens: [
      { label: 'Fornecedores', to: '/fornecedores', icon: Truck, roles: GESTAO },
      { label: 'Compras', to: '/compras', icon: ScrollText, roles: GESTAO },
    ],
  },
  {
    titulo: 'Gestão',
    itens: [
      { label: 'Contas a pagar', to: '/contas-pagar', icon: ReceiptText, roles: GESTAO },
      { label: 'Relatórios', to: '/relatorios', icon: BarChart3, roles: GESTAO },
      { label: 'Usuários', to: '/usuarios', icon: Users, roles: ADMIN },
      { label: 'Auditoria', to: '/auditoria', icon: ShieldCheck, roles: GESTAO },
      { label: 'Configurações', to: '/configuracoes', icon: Settings, roles: ADMIN },
    ],
  },
];

export const navItems: NavItem[] = navGroups.flatMap((g) => g.itens);

export function visibleNavItems(role: Role | undefined): NavItem[] {
  if (!role) return [];
  return navItems.filter((item) => item.roles.includes(role));
}

/** Grupos já filtrados pelo perfil; grupos que ficariam vazios somem. */
export function visibleNavGroups(role: Role | undefined): NavGroup[] {
  if (!role) return [];
  return navGroups
    .map((g) => ({ ...g, itens: g.itens.filter((i) => i.roles.includes(role)) }))
    .filter((g) => g.itens.length > 0);
}
