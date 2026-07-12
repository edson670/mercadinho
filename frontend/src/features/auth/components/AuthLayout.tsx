import { type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Store } from 'lucide-react';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { getBranding } from '@/features/settings/api/settings.api';

interface AuthLayoutProps {
  children: ReactNode;
}

/**
 * Layout compartilhado das telas de autenticação (login, recuperar/redefinir senha).
 * Busca nome e logotipo da empresa (endpoint público) para que cada cliente veja
 * sua própria marca sem precisar de nenhuma configuração no código.
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  const { data: branding } = useQuery({
    queryKey: ['branding'],
    queryFn: getBranding,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const nome = branding?.nome || 'Sistema Mercadinho';
  const logoUrl = branding?.logoUrl;

  return (
    <div className="flex min-h-screen">
      {/* Painel de marca — visível em telas médias/grandes */}
      <div className="relative hidden w-1/2 flex-col items-center justify-center overflow-hidden bg-primary p-12 text-primary-foreground lg:flex">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 25% 20%, rgba(255,255,255,0.16), transparent 55%), radial-gradient(circle at 80% 75%, rgba(255,255,255,0.12), transparent 50%)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: 'radial-gradient(white 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        <div className="relative z-10 flex max-w-sm flex-col items-center text-center">
          <div className="mb-6 flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl bg-white/95 shadow-xl">
            {logoUrl ? (
              <img src={logoUrl} alt={nome} className="h-full w-full object-contain p-3" />
            ) : (
              <Store className="h-14 w-14 text-primary" />
            )}
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{nome}</h1>
          <p className="mt-3 text-sm leading-relaxed text-primary-foreground/85">
            Gestão completa do seu mercadinho: vendas, estoque, fiado, caixa e relatórios em um
            só lugar.
          </p>
        </div>
      </div>

      {/* Painel do formulário */}
      <div className="flex flex-1 flex-col bg-muted/30">
        <div className="flex items-center justify-between p-4 lg:justify-end">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary text-primary-foreground">
              {logoUrl ? (
                <img src={logoUrl} alt={nome} className="h-full w-full object-contain p-1" />
              ) : (
                <Store className="h-5 w-5" />
              )}
            </div>
            <span className="font-semibold">{nome}</span>
          </div>
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center p-4 pb-16">{children}</div>
      </div>
    </div>
  );
}
