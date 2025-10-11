// Real App with RainbowKit and SIWE Authentication
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { AuthProvider } from './contexts/RealAuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Toaster } from './components/ui/sonner';

// Import pages
import RealLoginPage from './pages/RealLoginPage';
import OnboardingPage from './pages/OnboardingPage';
import DashboardPage from './pages/DashboardPage';
import EmployeesPage from './pages/EmployeesPage';
import PayrollsPage from './pages/PayrollsPage';
import CreatePayrollPage from './pages/CreatePayrollPage';
import PayrollDetailPage from './pages/PayrollDetailPage';

// Import wagmi config
import { config } from './lib/wagmi';

// Import RainbowKit styles
import '@rainbow-me/rainbowkit/styles.css';

// Create query client for React Query
const queryClient = new QueryClient();

export default function RealApp() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                {/* Public route */}
                <Route path="/" element={<RealLoginPage />} />

                {/* Protected routes - require authentication */}
                <Route
                  path="/onboarding"
                  element={
                    <ProtectedRoute>
                      <OnboardingPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute requireOrganization>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/employees"
                  element={
                    <ProtectedRoute requireOrganization>
                      <EmployeesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/payrolls"
                  element={
                    <ProtectedRoute requireOrganization>
                      <PayrollsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/payrolls/create"
                  element={
                    <ProtectedRoute requireOrganization>
                      <CreatePayrollPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/payrolls/:id"
                  element={
                    <ProtectedRoute requireOrganization>
                      <PayrollDetailPage />
                    </ProtectedRoute>
                  }
                />
              </Routes>
              <Toaster />
            </BrowserRouter>
          </AuthProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

