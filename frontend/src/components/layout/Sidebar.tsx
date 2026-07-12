import { NavLink } from 'react-router-dom';
import { Store, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { visibleNavItems } from './navigation';

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, mobileMenuOpen, closeMobileMenu } = useUIStore();
  const role = useAuthStore((s) => s.user?.role);
  const items = visibleNavItems(role);

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
          'fixed inset-y-0 left-0 z-40 flex h-screen w-64 flex-col border-r bg-card transition-transform duration-300',
          'md:static md:z-auto md:translate-x-0 md:transition-[width]',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
          sidebarCollapsed && 'md:w-16',
        )}
      >
        {/* Marca */}
        <div className="flex h-16 items-center gap-2 border-b px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Store className="h-5 w-5" />
          </div>
          {!sidebarCollapsed && <span className="text-lg font-semibold">Mercadinho</span>}
        </div>

        {/* Navegação */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {items.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={closeMobileMenu}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  sidebarCollapsed && 'md:justify-center md:px-2',
                )
              }
              title={sidebarCollapsed ? label : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className={cn(sidebarCollapsed && 'md:hidden')}>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Recolher (apenas desktop — no mobile o fechamento é via backdrop/hamburger) */}
        <div className="hidden border-t p-2 md:block">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center"
            onClick={toggleSidebar}
            aria-label="Recolher menu"
          >
            <ChevronLeft className={cn('h-5 w-5 transition-transform', sidebarCollapsed && 'rotate-180')} />
          </Button>
        </div>
      </aside>
    </>
  );
}
