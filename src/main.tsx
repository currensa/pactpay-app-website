import '@/index.css';
import ReownAppKitProvider from '@/providers/app-kit-provider';
import { router } from '@/router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ReownAppKitProvider>
      <RouterProvider router={router} />
    </ReownAppKitProvider>
  </StrictMode>
);

