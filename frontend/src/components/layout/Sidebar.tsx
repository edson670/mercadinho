import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Store, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { useActiveOrdersCount } from '@/features/orders/api/use-orders';
import { getBranding } from '@/features/settings/api/settings.api';
import { visibleNavGroups } from './navigation';

/** Selo pulsante com a contagem de pedidos WhatsApp aguardando separação. */
function LiveOrdersBadge({ collapsed }: { collapsed: boolean }) {
  const { data: count } = useActiveOrdersCount();
  if (!count) return null;

  return (
    <span
      className={cn(
        'relative flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-bold text-destructive-foreground',
        collapsed && 'absolute -right-1 -top-1 h-4 min-w-4 text-[9px] md:flex',
      )}
    >
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
      <span className="relative">{count > 9 ? '9+' : count}</span>
    </span>
  );
}

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, mobileMenuOpen, closeMobileMenu } = useUIStore();
  const role = useAuthStore((s) => s.user?.role);
  const grupos = visibleNavGroups(role);
  // Mesma marca usada na tela de login (AuthLayout) — a sidebar deixava de
  // refletir o logo/nome que o cliente já personalizou em Configurações.
  const { data: branding } = useQuery({
    queryKey: ['branding'],
    queryFn: getBranding,
    staleTime: 5 * 60_000,
    retry: false,
  });
  const nome = branding?.nome || 'Mercadinho';

  return (
    <>
      {/* Backdrop do drawer mobile */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex h-screen w-64 flex-col border-r border-edge-soft bg-card transition-transform duration-300',
          'md:static md:z-auto md:translate-x-0 md:transition-[width]',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
          sidebarCollapsed && 'md:w-16',
        )}
      >
        {/* Marca — mesmo logo/nome personalizados na tela de login */}
        <div className="flex items-center gap-3 px-5 pb-5 pt-6">
          <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl2 bg-primary text-primary-foreground shadow-glow">
            {branding?.logoUrl ? (
              <img src={branding.logoUrl} alt={nome} className="h-full w-full object-cover" />
            ) : (
              <Store className="h-[19px] w-[19px]" />
            )}
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <div className="truncate text-[15px] font-extrabold leading-none tracking-tight">
                {nome}
              </div>
              <div className="mt-0.5 text-[11px] font-medium text-muted-foreground">
                Ponto de venda
              </div>
            </div>
          )}
        </div>

        {/* Navegação agrupada por momento de uso */}
        <nav className="flex-1 overflow-y-auto px-3 pb-3">
          {grupos.map((grupo) => (
            <div key={grupo.titulo} className="mb-5">
              {!sidebarCollapsed && (
                <div className="px-3 pb-2 text-[10.5px] font-bold uppercase tracking-[.1em] text-muted-foreground/80">
                  {grupo.titulo}
                </div>
              )}
              <div className="flex flex-col gap-0.5">
                {grupo.itens.map(({ label, to, icon: Icon, liveOrdersBadge }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    onClick={closeMobileMenu}
                    className={({ isActive }) =>
                      cn(
                        'group relative flex items-center gap-3 rounded-xl2 px-3 py-2 text-[13.5px] font-semibold transition-all duration-150 ease-fluid',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-glow'
                          : 'text-ink-soft hover:bg-accent hover:text-accent-foreground',
                        sidebarCollapsed && 'md:justify-center md:px-2',
                      )
                    }
                    title={sidebarCollapsed ? label : undefined}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    <span className={cn('flex-1 truncate', sidebarCollapsed && 'md:hidden')}>
                      {label}
                    </span>
                    {liveOrdersBadge && <LiveOrdersBadge collapsed={Boolean(sidebarCollapsed)} />}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Recolher (apenas desktop — no mobile o fechamento é via backdrop/hamburger) */}
        <div className="hidden p-3 md:block">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center text-muted-foreground"
            onClick={toggleSidebar}
            aria-label="Recolher menu"
          >
            <ChevronLeft className={cn('h-5 w-5 transition-transform duration-200 ease-fluid', sidebarCollapsed && 'rotate-180')} />
          </Button>
        </div>
      </aside>
    </>
  );
}
