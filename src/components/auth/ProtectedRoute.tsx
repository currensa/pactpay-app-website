// Protected Route Component with Authentication Guard
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/RealAuthContext';
import { useAccount } from 'wagmi';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOrganization?: boolean;
}

export function ProtectedRoute({ children, requireOrganization = false }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user, organizations } = useAuth();
  const { isConnected } = useAccount();

  // Show loading state
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

  // Check wallet connection
  if (!isConnected) {
    return <Navigate to="/" replace />;
  }

  // Check authentication
  if (!isAuthenticated || !user) {
    return <Navigate to="/" replace />;
  }

  // Check organization requirement
  if (requireOrganization && organizations.length === 0) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

