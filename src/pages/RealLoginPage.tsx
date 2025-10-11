// Real Login Page with RainbowKit and SIWE
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/RealAuthContext';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from '../components/ui/button';
import { Shield, Users, Zap, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function RealLoginPage() {
  const { isAuthenticated, isLoading, login, organizations, user } = useAuth();
  const { isConnected, address } = useAccount();
  const navigate = useNavigate();
  const [signing, setSigning] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      if (organizations.length === 0) {
        navigate('/onboarding');
      } else {
        navigate('/dashboard');
      }
    }
  }, [isAuthenticated, organizations, user, navigate]);

  const handleSignIn = async () => {
    if (!isConnected || !address) {
      toast.error('Please connect your wallet first');
      return;
    }

    setSigning(true);
    try {
      await login();
      toast.success('Successfully signed in!');
    } catch (error: any) {
      console.error('Sign in failed:', error);
      
      // Handle specific errors
      if (error.message?.includes('User rejected')) {
        toast.error('Signature request was rejected');
      } else if (error.message?.includes('wallet')) {
        toast.error('Please connect your wallet first');
      } else {
        toast.error('Sign in failed. Please try again.');
      }
    } finally {
      setSigning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col">
      {/* Header */}
      <header className="p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <Shield className="size-8 text-blue-600" />
            <span className="ml-2 text-xl font-semibold text-blue-600">Safe Payroll</span>
          </div>
          <div className="flex items-center gap-4">
            <ConnectButton />
          </div>
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
            {!isConnected ? (
              // Not connected - show connect prompt
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center size-16 bg-blue-100 rounded-full mb-2">
                  <Shield className="size-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-semibold">Connect Your Wallet</h2>
                <p className="text-muted-foreground mb-6">
                  Connect your Ethereum wallet to get started with Safe Payroll
                </p>
                <div className="flex justify-center">
                  <ConnectButton />
                </div>
              </div>
            ) : (
              // Connected - show sign in
              <div className="space-y-6">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center size-16 bg-green-100 rounded-full mb-2">
                    <Shield className="size-8 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-semibold mb-2">Wallet Connected</h2>
                  <p className="text-sm text-muted-foreground font-mono">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </p>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="size-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-blue-900 mb-1">Sign Message to Continue</p>
                      <p className="text-blue-700 text-sm">
                        You'll be asked to sign a message to verify your wallet ownership. 
                        This is free and doesn't require any gas fees.
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleSignIn}
                  disabled={isLoading || signing}
                  className="w-full h-14 text-lg"
                  size="lg"
                >
                  {signing ? (
                    <>
                      <div className="animate-spin size-5 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Signing Message...
                    </>
                  ) : (
                    'Sign In with Ethereum'
                  )}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  By signing in, you agree to use Safe Payroll for secure payroll management
                </p>
              </div>
            )}
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

