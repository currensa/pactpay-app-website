import { Buffer } from 'buffer';
// Polyfill Node's global `Buffer` for browser crypto libs (circomlibjs, snarkjs).
if (!globalThis.Buffer) globalThis.Buffer = Buffer;

import { Toaster } from '@/components/ui/toaster';
import ConfirmSyncBootstrap from '@/components/app/base/confirm-sync-bootstrap';
import '@/index.css';
import ReownAppKitProvider from '@/providers/app-kit-provider';
import { buildWalletNetworks } from '@/providers/wallet-networks';
import apis from '@/apis';
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

const root = createRoot(document.getElementById('root')!);

async function renderApp() {
  root.render(<div role="status">Loading wallet networks...</div>);
  try {
    const networks = buildWalletNetworks(await apis.chainAsset.getNetworks());
    root.render(
      <ReownAppKitProvider networks={networks}>
        <DisableMobileZoom />
        <ConfirmSyncBootstrap />
        <RouterProvider router={router} />
        <Toaster />
      </ReownAppKitProvider>
    );
  } catch {
    root.render(
      <div role="alert">
        Unable to load wallet networks from the server.{' '}
        <button type="button" onClick={() => void renderApp()}>Retry</button>
      </div>
    );
  }
}

void renderApp();
