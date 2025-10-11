// App with RainbowKit and SIWE Authentication
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAccount, WagmiProvider } from 'wagmi';
import { Toaster } from './components/ui/sonner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { config } from './lib/wagmi';
import CreatePayrollPage from './pages/CreatePayrollPage';
import DashboardPage from './pages/DashboardPage';
import EmployeesPage from './pages/EmployeesPage';
import LoginPage from './pages/LoginPage';
import OnboardingPage from './pages/OnboardingPage';
import OrganizationSelectorPage from './pages/OrganizationSelectorPage';
import PayrollDetailPage from './pages/PayrollDetailPage';
import PayrollsPage from './pages/PayrollsPage';

// Create query client for React Query
const queryClient = new QueryClient();

// Protected Route wrapper
function ProtectedRoute({ children, requireOrganization = false }: { children: React.ReactNode; requireOrganization?: boolean }) {
  const { isAuthenticated, isLoading, organizations, user } = useAuth();
  const { isConnected } = useAccount();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin size-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isConnected || !isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Check if route requires an organization to be selected
  if (requireOrganization) {
    if (organizations.length === 0) {
      // No organizations at all, go to onboarding
      return <Navigate to="/onboarding" replace />;
    }
    if (!user?.currentOrganization) {
      // Has organizations but none selected, go to selector
      return <Navigate to="/select-organization" replace />;
    }
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<LoginPage />} />
                <Route
                  path="/onboarding"
                  element={
                    <ProtectedRoute>
                      <OnboardingPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/select-organization"
                  element={
                    <ProtectedRoute>
                      <OrganizationSelectorPage />
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
