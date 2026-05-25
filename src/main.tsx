import { Toaster } from '@/components/ui/toaster';
import PreferencesBootstrap from '@/components/app/base/preferences-bootstrap';
import '@/index.css';
import ReownAppKitProvider from '@/providers/app-kit-provider';
import { router } from '@/router';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import '../tailwind.config.js';

createRoot(document.getElementById('root')!).render(
  <ReownAppKitProvider>
    <PreferencesBootstrap />
    <RouterProvider router={router} />
    <Toaster />
  </ReownAppKitProvider>
);

