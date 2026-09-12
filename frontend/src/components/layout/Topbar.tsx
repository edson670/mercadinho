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
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-edge-soft bg-card/85 px-4 backdrop-blur-xl sm:px-6">
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
        <div className="flex items-center gap-2.5 rounded-xl2 bg-foreground/[0.035] px-2 py-1.5 sm:px-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-primary to-primary-hover text-[11px] font-bold text-primary-foreground">
            {user ? iniciais(user.nome) : ''}
          </span>
          <div className="hidden leading-tight sm:block">
            <p className="text-[12.5px] font-bold">{user?.nome}</p>
            <p className="text-[11px] text-muted-foreground">
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
