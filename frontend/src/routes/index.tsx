import { lazy, Suspense, type ComponentType } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { PageLoader } from '@/components/shared/PageLoader';
import { ProtectedRoute } from './ProtectedRoute';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage';

// Catálogo público (cliente final, sem autenticação) — carregado sob demanda.
const CatalogPage = lazy(() =>
  import('@/features/catalog/pages/CatalogPage').then((m) => ({ default: m.CatalogPage })),
);
const CheckoutPage = lazy(() =>
  import('@/features/catalog/pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage })),
);
const OrderTrackingPage = lazy(() =>
  import('@/features/catalog/pages/OrderTrackingPage').then((m) => ({ default: m.OrderTrackingPage })),
);

// Páginas autenticadas carregadas sob demanda (code-splitting por rota) —
// reduz o bundle inicial, que só precisa do login antes de qualquer navegação.
const DashboardPage = lazy(() =>
  import('@/features/dashboard/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const UsersPage = lazy(() => import('@/features/users/pages/UsersPage').then((m) => ({ default: m.UsersPage })));
const CategoriesPage = lazy(() =>
  import('@/features/categories/pages/CategoriesPage').then((m) => ({ default: m.CategoriesPage })),
);
const ProductsPage = lazy(() =>
  import('@/features/products/pages/ProductsPage').then((m) => ({ default: m.ProductsPage })),
);
const CustomersPage = lazy(() =>
  import('@/features/customers/pages/CustomersPage').then((m) => ({ default: m.CustomersPage })),
);
const SuppliersPage = lazy(() =>
  import('@/features/suppliers/pages/SuppliersPage').then((m) => ({ default: m.SuppliersPage })),
);
const StockPage = lazy(() => import('@/features/stock/pages/StockPage').then((m) => ({ default: m.StockPage })));
const PurchasesPage = lazy(() =>
  import('@/features/purchases/pages/PurchasesPage').then((m) => ({ default: m.PurchasesPage })),
);
const CashRegisterPage = lazy(() =>
  import('@/features/cash-register/pages/CashRegisterPage').then((m) => ({ default: m.CashRegisterPage })),
);
const PdvPage = lazy(() => import('@/features/sales/pages/PdvPage').then((m) => ({ default: m.PdvPage })));
const SalesHistoryPage = lazy(() =>
  import('@/features/sales/pages/SalesHistoryPage').then((m) => ({ default: m.SalesHistoryPage })),
);
const CreditPage = lazy(() => import('@/features/credit/pages/CreditPage').then((m) => ({ default: m.CreditPage })));
const WhatsAppOrdersPage = lazy(() =>
  import('@/features/orders/pages/WhatsAppOrdersPage').then((m) => ({ default: m.WhatsAppOrdersPage })),
);
const OrderHistoryPage = lazy(() =>
  import('@/features/orders/pages/OrderHistoryPage').then((m) => ({ default: m.OrderHistoryPage })),
);
const ReportsPage = lazy(() =>
  import('@/features/reports/pages/ReportsPage').then((m) => ({ default: m.ReportsPage })),
);
const AuditPage = lazy(() => import('@/features/audit/pages/AuditPage').then((m) => ({ default: m.AuditPage })));
const SettingsPage = lazy(() =>
  import('@/features/settings/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);

/** Envolve uma página lazy em Suspense, mantendo AppShell (sidebar/topbar) montado durante o carregamento. */
function lazyPage(Component: ComponentType) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/recuperar-senha', element: <ForgotPasswordPage /> },
  { path: '/redefinir-senha', element: <ResetPasswordPage /> },
  { path: '/catalogo', element: lazyPage(CatalogPage) },
  { path: '/catalogo/checkout', element: lazyPage(CheckoutPage) },
  { path: '/catalogo/pedido/:trackingToken', element: lazyPage(OrderTrackingPage) },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: lazyPage(DashboardPage) },
          { path: '/vendas', element: lazyPage(PdvPage) },
          { path: '/vendas/historico', element: lazyPage(SalesHistoryPage) },
          { path: '/pedidos-whatsapp', element: lazyPage(WhatsAppOrdersPage) },
          { path: '/pedidos-whatsapp/historico', element: lazyPage(OrderHistoryPage) },
          { path: '/fiado', element: lazyPage(CreditPage) },
          { path: '/caixa', element: lazyPage(CashRegisterPage) },
          { path: '/clientes', element: lazyPage(CustomersPage) },
          { path: '/produtos', element: lazyPage(ProductsPage) },
          { path: '/categorias', element: lazyPage(CategoriesPage) },
          { path: '/estoque', element: lazyPage(StockPage) },
          { path: '/fornecedores', element: lazyPage(SuppliersPage) },
          { path: '/compras', element: lazyPage(PurchasesPage) },
          { path: '/relatorios', element: lazyPage(ReportsPage) },
        ],
      },
      {
        element: <ProtectedRoute roles={['ADMINISTRADOR', 'GERENTE']} />,
        children: [
          {
            element: <AppShell />,
            children: [{ path: '/auditoria', element: lazyPage(AuditPage) }],
          },
        ],
      },
      {
        element: <ProtectedRoute roles={['ADMINISTRADOR']} />,
        children: [
          {
            element: <AppShell />,
            children: [
              { path: '/usuarios', element: lazyPage(UsersPage) },
              { path: '/configuracoes', element: lazyPage(SettingsPage) },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
