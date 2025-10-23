import { useAuth } from "@/contexts/AuthContext";
import CreatePayrollPage from "@/pages/CreatePayrollPage";
import DashboardPage from "@/pages/DashboardPage";
import EmployeesPage from "@/pages/EmployeesPage";
import LoginPage from "@/pages/LoginPage";
import OnboardingPage from "@/pages/OnboardingPage";
import OrganizationSelectorPage from "@/pages/OrganizationSelectorPage";
import PayrollDetailPage from "@/pages/PayrollDetailPage";
import PayrollsPage from "@/pages/PayrollsPage";

import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { useAccount } from "wagmi";

function ProtectedRoute({ children, requireOrganization = false }: { children: React.ReactNode; requireOrganization?: boolean }) {
  const { isAuthenticated, isLoading, organizations, currentOrganization } = useAuth();
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

  if (!isConnected || !isAuthenticated) return <Navigate to="/" replace />;

  if (requireOrganization) {
    if (organizations.length === 0) return <Navigate to="/onboarding" replace />
    if (!currentOrganization) return <Navigate to="/select-organization" replace />
  }

  return <>{children}</>;
}

export default function Router() {
  return <BrowserRouter>
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route
        path="/onboarding"
        element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>}
      />
      <Route
        path="/select-organization"
        element={<ProtectedRoute><OrganizationSelectorPage /></ProtectedRoute>}
      />
      <Route
        path="/dashboard"
        element={<ProtectedRoute requireOrganization><DashboardPage /></ProtectedRoute>}
      />
      <Route
        path="/employees"
        element={<ProtectedRoute requireOrganization><EmployeesPage /></ProtectedRoute>}
      />
      <Route
        path="/payrolls"
        element={<ProtectedRoute requireOrganization><PayrollsPage /></ProtectedRoute>}
      />
      <Route
        path="/payrolls/create"
        element={<ProtectedRoute requireOrganization><CreatePayrollPage /></ProtectedRoute>}
      />
      <Route
        path="/payrolls/:id"
        element={<ProtectedRoute requireOrganization><PayrollDetailPage /></ProtectedRoute>}
      />
    </Routes>
    <Toaster />
  </BrowserRouter>
}
