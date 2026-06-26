import { Toaster } from '@/components/ui/toaster';
import PreferencesBootstrap from '@/components/app/base/preferences-bootstrap';
import ConfirmSyncBootstrap from '@/components/app/base/confirm-sync-bootstrap';
import '@/index.css';
import ReownAppKitProvider from '@/providers/app-kit-provider';
import { router } from '@/router';
import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import '../tailwind.config.js';

function DisableMobileZoom() {
  useEffect(() => {
    let lastTouchEnd = 0;

    const preventGesture = (event: Event) => {
      event.preventDefault();
    };

    const preventDoubleTapZoom = (event: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    };

    document.addEventListener('gesturestart', preventGesture);
    document.addEventListener('touchend', preventDoubleTapZoom, { passive: false });

    return () => {
      document.removeEventListener('gesturestart', preventGesture);
      document.removeEventListener('touchend', preventDoubleTapZoom);
    };
  }, []);

  return null;
}

createRoot(document.getElementById('root')!).render(
  <ReownAppKitProvider>
    <DisableMobileZoom />
    <PreferencesBootstrap />
    <ConfirmSyncBootstrap />
    <RouterProvider router={router} />
    <Toaster />
  </ReownAppKitProvider>
);

