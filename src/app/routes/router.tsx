import { createBrowserRouter, Link } from 'react-router';
import { AppLayout } from '@/app/layouts/app-layout';
import { RouteError } from '@/components/shared/route-error';
import { DashboardPage } from '@/features/dashboard/dashboard-page';
import { Button } from '@/components/ui/button';
import { RequireAuth } from '@/features/auth';

export const router = createBrowserRouter([
  {
    path: '/login',
    ErrorBoundary: RouteError,
    lazy: async () => ({
      Component: (await import('@/features/auth/login-page')).LoginPage,
    }),
  },
  {
    Component: RequireAuth,
    ErrorBoundary: RouteError,
    children: [
      {
        path: '/',
        Component: AppLayout,
        ErrorBoundary: RouteError,
        children: [
          { index: true, Component: DashboardPage },
          {
            path: 'compras-credito',
            lazy: async () => ({
              Component: (
                await import('@/features/transactions/credit-purchases-page')
              ).CreditPurchasesPage,
            }),
          },
          {
            path: 'faturas',
            lazy: async () => ({
              Component: (await import('@/features/invoices/invoices-page'))
                .InvoicesPage,
            }),
          },
          {
            path: 'contas',
            lazy: async () => ({
              Component: (await import('@/features/accounts/accounts-page'))
                .AccountsPage,
            }),
          },
          {
            path: 'cartoes',
            lazy: async () => ({
              Component: (await import('@/features/cards/cards-page'))
                .CardsPage,
            }),
          },
          {
            path: 'movimentacoes',
            lazy: async () => ({
              Component: (
                await import('@/features/transactions/transactions-page')
              ).TransactionsPage,
            }),
          },
          {
            path: 'parcelamentos',
            lazy: async () => ({
              Component: (
                await import('@/features/installments/installments-page')
              ).InstallmentsPage,
            }),
          },
          {
            path: 'receitas',
            lazy: async () => ({
              Component: (await import('@/features/income/income-page'))
                .IncomePage,
            }),
          },
          {
            path: 'recorrencias',
            lazy: async () => ({
              Component: (await import('@/features/recurring/recurring-page'))
                .RecurringPage,
            }),
          },
          {
            path: 'categorias',
            lazy: async () => ({
              Component: (await import('@/features/categories/categories-page'))
                .CategoriesPage,
            }),
          },
          {
            path: 'assistente',
            lazy: async () => ({
              Component: (await import('@/features/ai-chat/ai-chat-page'))
                .AiChatPage,
            }),
          },
          {
            path: 'configuracoes',
            lazy: async () => ({
              Component: (await import('@/features/settings/settings-page'))
                .SettingsPage,
            }),
          },
          {
            path: '*',
            element: (
              <section className="standalone">
                <h1>Página não encontrada</h1>
                <Button asChild>
                  <Link to="/">Voltar para a visão geral</Link>
                </Button>
              </section>
            ),
          },
        ],
      },
    ],
  },
]);
