import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { PageLoader } from '@/components/shared/PageLoader';
import type { Role } from '@/types';

interface ProtectedRouteProps {
  roles?: Role[]; // se informado, restringe o acesso a esses perfis
}

export function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const { isAuthenticated, user, sessionReady } = useAuthStore();
  const location = useLocation();

  // O access token vive só em memória — some ao recarregar. Enquanto o App
  // ainda está tentando trocar o cookie HttpOnly por um token novo, esperar
  // evita mandar para /login alguém que só deu um refresh na página.
  if (!sessionReady) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
