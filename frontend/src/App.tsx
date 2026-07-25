import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { router } from '@/routes';
import { Toaster } from '@/components/shared/Toaster';
import { useAuthStore } from '@/stores/auth.store';

export function App() {
  const restoreSession = useAuthStore((s) => s.restoreSession);

  // O access token vive só em memória (nunca no localStorage — ver A2 na
  // análise de segurança), então some ao recarregar a página. Se havia um
  // usuário lembrado, tenta trocar o cookie HttpOnly por um access token novo
  // antes de decidir se a rota protegida deixa passar.
  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>
  );
}
