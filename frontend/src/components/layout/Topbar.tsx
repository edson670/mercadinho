import { LogOut, Menu, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { useAuthStore } from '@/stores/auth.store';
import { useUIStore } from '@/stores/ui.store';
import { logout as apiLogout } from '@/features/auth/api/auth.api';

const roleLabel: Record<string, string> = {
  ADMINISTRADOR: 'Administrador',
  GERENTE: 'Gerente',
  CAIXA: 'Caixa',
};

export function Topbar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const toggleMobileMenu = useUIStore((s) => s.toggleMobileMenu);
  const navigate = useNavigate();

  const handleLogout = async () => {
    const refreshToken = useAuthStore.getState().refreshToken;
    // Best-effort: revoga a sessão no backend; segue mesmo se falhar.
    if (refreshToken) {
      try {
        await apiLogout(refreshToken);
      } catch {
        /* ignora erro de rede no logout */
      }
    }
    logout();
    navigate('/login');
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={toggleMobileMenu}
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <div className="hidden md:block" />
      <div className="flex items-center gap-2 sm:gap-3">
        <ThemeToggle />
        <div className="flex items-center gap-2 rounded-md border px-2 py-1.5 sm:px-3">
          <User className="h-4 w-4 text-muted-foreground" />
          <div className="hidden text-right leading-tight sm:block">
            <p className="text-sm font-medium">{user?.nome}</p>
            <p className="text-xs text-muted-foreground">
              {user ? roleLabel[user.role] : ''}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Sair">
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
