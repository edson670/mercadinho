import { LogOut, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { useAuthStore } from '@/stores/auth.store';
import { useUIStore } from '@/stores/ui.store';

const roleLabel: Record<string, string> = {
  ADMINISTRADOR: 'Administrador',
  GERENTE: 'Gerente',
  CAIXA: 'Caixa',
};

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? '';
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toUpperCase();
}

export function Topbar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const toggleMobileMenu = useUIStore((s) => s.toggleMobileMenu);
  const navigate = useNavigate();

  const handleLogout = async () => {
    // A store já chama /auth/logout (revoga o refresh token e limpa o cookie).
    await logout();
    navigate('/login');
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/80 sm:px-6">
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
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-gold text-xs font-bold text-foreground">
            {user ? iniciais(user.nome) : ''}
          </span>
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
