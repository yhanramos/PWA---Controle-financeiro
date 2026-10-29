import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import { AppProviders } from '@/app/providers/app-providers';
import { router } from '@/app/routes/router';
import '@/styles/tailwind.css';
import '@/styles/app.scss';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Elemento raiz da aplicação não encontrado.');

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
