// Login Page with RainbowKit and SIWE
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { Shield, Users, Wallet, Zap } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAccount } from 'wagmi';
import { Button } from '../components/ui/button';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { isAuthenticated, isLoading, login, needsCompanySelection, getAvailableCompanies, selectCompany } = useAuth();
  const { isConnected, address } = useAccount();
  const { openConnectModal } = useConnectModal();
  const navigate = useNavigate();
  const [signing, setSigning] = useState(false);
  const [shouldAutoSign, setShouldAutoSign] = useState(false);

  // Handle sign in
  const handleSignIn = useCallback(async () => {
    if (!isConnected || !address) {
      toast.error('Please connect your wallet first');
      return;
    }

    setSigning(true);
    try {
      await login();
      toast.success('Successfully signed in!');

      // After successful login, handle company selection flow
      // This will be handled by the useEffect below
    } catch (error: any) {
      console.error('Sign in failed:', error);

      // Handle specific errors
      if (error.message?.includes('User rejected') || error.message?.includes('rejected')) {
        toast.error('Signature request was rejected');
      } else if (error.message?.includes('wallet')) {
        toast.error('Please connect your wallet first');
      } else {
        toast.error('Sign in failed. Please try again.');
      }
    } finally {
      setSigning(false);
      setShouldAutoSign(false);
    }
  }, [isConnected, address, login]);

  // Handle company selection after login
  useEffect(() => {
    if (isAuthenticated && needsCompanySelection) {
      // User just logged in and needs to select a company
      handleCompanySelection();
    } else if (isAuthenticated && !needsCompanySelection) {
      // User already has company context, go to dashboard
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, needsCompanySelection]);

  const handleCompanySelection = async () => {
    try {
      const { companies } = await getAvailableCompanies();

      if (companies.length === 0) {
        // No companies, redirect to onboarding
        navigate('/onboarding', { replace: true });
      } else {
        // Has companies (one or more), show selection page
        navigate('/select-organization', { replace: true });
      }
    } catch (error: any) {
      console.error('Failed to handle company selection:', error);
      toast.error('Failed to load organizations');
    }
  };

  // Auto sign after wallet connection (only when user initiated login)
  useEffect(() => {
    if (shouldAutoSign && isConnected && !isAuthenticated && address && !signing) {
      handleSignIn();
    }
  }, [shouldAutoSign, isConnected, isAuthenticated, address, signing, handleSignIn]);

  const handleLogin = () => {
    if (!isConnected) {
      // Mark that we should auto-sign after connection
      setShouldAutoSign(true);
      // Open RainbowKit connect modal
      openConnectModal?.();
    } else {
      // Already connected, proceed to sign in
      handleSignIn();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col">
      {/* Header */}
      <header className="p-6">
        <div className="max-w-7xl mx-auto flex items-center">
          <Shield className="size-8 text-blue-600" />
          <span className="ml-2 text-xl font-semibold text-blue-600">Safe Payroll</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-2xl w-full">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center size-20 bg-blue-100 rounded-full mb-6">
              <Shield className="size-10 text-blue-600" />
            </div>
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Secure Payroll Management with Safe
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Manage your team's payroll with multi-signature security.
              Built on Safe (Gnosis Safe) for maximum protection of your funds.
            </p>
          </div>

          {/* Sign In Card */}
          <div className="bg-white rounded-xl shadow-lg p-8 border border-border">
            <div className="text-center space-y-6">
              <div className="inline-flex items-center justify-center size-16 bg-blue-100 rounded-full mb-2">
                <Wallet className="size-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-semibold">Welcome to Safe Payroll</h2>
              <p className="text-muted-foreground">
                Connect your Ethereum wallet to securely manage your team's payroll
              </p>

              {isConnected && address && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800 font-medium">Wallet Connected</p>
                  <p className="text-xs text-green-600 font-mono mt-1">
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </p>
                </div>
              )}

              <Button
                onClick={handleLogin}
                disabled={isLoading || signing}
                className="w-full h-14 text-lg"
                size="lg"
              >
                {signing ? (
                  <>
                    <div className="animate-spin size-5 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Signing Message...
                  </>
                ) : isConnected ? (
                  'Sign In with Ethereum'
                ) : (
                  <>
                    <Wallet className="mr-2 size-5" />
                    Connect Wallet & Sign In
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                {isConnected
                  ? 'Click to sign a message and verify your wallet ownership (free, no gas required)'
                  : 'Connect your wallet and sign in seamlessly in one flow'
                }
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-white/50 rounded-lg border border-border backdrop-blur-sm">
              <div className="inline-flex items-center justify-center size-12 bg-blue-100 rounded-lg mb-4">
                <Shield className="size-6 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-2">Non-Custodial</h3>
              <p className="text-sm text-muted-foreground">
                Your funds stay in your Safe wallet. We never have access to your private keys.
              </p>
            </div>

            <div className="text-center p-6 bg-white/50 rounded-lg border border-border backdrop-blur-sm">
              <div className="inline-flex items-center justify-center size-12 bg-purple-100 rounded-lg mb-4">
                <Users className="size-6 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">Multi-Signature</h3>
              <p className="text-sm text-muted-foreground">
                Require multiple approvals for every payroll transaction.
              </p>
            </div>

            <div className="text-center p-6 bg-white/50 rounded-lg border border-border backdrop-blur-sm">
              <div className="inline-flex items-center justify-center size-12 bg-green-100 rounded-lg mb-4">
                <Zap className="size-6 text-green-600" />
              </div>
              <h3 className="font-semibold mb-2">Batch Payments</h3>
              <p className="text-sm text-muted-foreground">
                Pay your entire team in a single transaction to save on gas fees.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="p-6 text-center text-muted-foreground space-y-2">
        <p className="text-sm">🔐 Secured by Safe (Gnosis Safe) Multi-Signature Technology</p>
        <p className="text-xs">Powered by Safe{'{'}Core{'}'} SDK • Supports Ethereum, Polygon, and more</p>
      </footer>
    </div>
  );
}
