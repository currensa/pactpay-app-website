// Onboarding Page - Create organization and link Safe wallet
import { AlertCircle, Building2, CheckCircle2, Loader2, Shield } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAccount } from 'wagmi';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/api-client';

const SUPPORTED_CHAINS = [
  { id: 1, name: 'Ethereum Mainnet' },
  { id: 11155111, name: 'Sepolia Testnet' },
  { id: 137, name: 'Polygon' },
];

export default function OnboardingPage() {
  const { user, walletAddress, selectCompany, logout } = useAuth();
  const { address } = useAccount();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    safeAddress: '',
    chainId: '11155111', // Default to Sepolia
  });

  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [safeInfo, setSafeInfo] = useState<{
    threshold: number;
    owners: string[];
  } | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError('');
    setIsVerified(false);
    setSafeInfo(null);
  };

  const handleVerifySafe = async () => {
    if (!formData.safeAddress) {
      setError('Please enter a Safe address');
      return;
    }

    if (!walletAddress) {
      setError('Wallet not connected');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      const chainId = parseInt(formData.chainId);

      // Get Safe info
      const info = await apiClient.getSafeInfo(formData.safeAddress, chainId);

      // Verify that the current user is an owner
      const verification = await apiClient.verifySafeOwner({
        safeAddress: formData.safeAddress,
        chainId,
        userAddress: walletAddress,
      });

      if (!verification.isOwner) {
        setError('You are not an owner of this Safe wallet');
        setIsVerifying(false);
        return;
      }

      // Success
      setSafeInfo({
        threshold: info.threshold,
        owners: info.owners,
      });
      setIsVerified(true);
      toast.success('Safe wallet verified successfully!');
    } catch (err: any) {
      console.error('Verification failed:', err);
      setError(err.message || 'Failed to verify Safe wallet');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isVerified) {
      setError('Please verify your Safe wallet first');
      return;
    }

    if (!user) {
      setError('User not authenticated');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const chainId = parseInt(formData.chainId);

      // Create organization
      const newOrg = await apiClient.createOrganization({
        name: formData.name,
        email: formData.email,
        safeAddress: formData.safeAddress,
        chainId,
      });

      toast.success('Organization created successfully!');

      // Select the newly created organization to get Stage 2 token
      await selectCompany(newOrg.id);

      toast.success('Organization activated!');

      // Navigate to dashboard
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      console.error('Failed to create organization:', err);
      setError(err.message || 'Failed to create organization');
      toast.error('Failed to create organization');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center size-16 bg-blue-100 rounded-full mb-4">
            <Building2 className="size-8 text-blue-600" />
          </div>
          <h1 className="mb-2">Create Your Organization</h1>
          <p className="text-muted-foreground">
            Link your Safe wallet to start managing payroll
          </p>
        </div>

        {/* User Info */}
        {address && (
          <div className="mb-6 p-4 bg-white rounded-lg border border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Shield className="size-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Connected Wallet</p>
                  <p className="font-mono text-sm font-medium">
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
              >
                Logout
              </Button>
            </div>
          </div>
        )}

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Organization Details</CardTitle>
            <CardDescription>
              Provide your organization information and link your Safe wallet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Organization Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Organization Name</Label>
                <Input
                  id="name"
                  placeholder="Acme Inc."
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Contact Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ceo@acme.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                />
              </div>

              {/* Network Selection */}
              <div className="space-y-2">
                <Label htmlFor="chainId">Network</Label>
                <Select
                  value={formData.chainId}
                  onValueChange={(value: string) => handleInputChange('chainId', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_CHAINS.map((chain) => (
                      <SelectItem key={chain.id} value={chain.id.toString()}>
                        {chain.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Safe Address */}
              <div className="space-y-2">
                <Label htmlFor="safeAddress">Safe Wallet Address</Label>
                <div className="flex gap-2">
                  <Input
                    id="safeAddress"
                    placeholder="0x..."
                    value={formData.safeAddress}
                    onChange={(e) => handleInputChange('safeAddress', e.target.value)}
                    required
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={handleVerifySafe}
                    disabled={isVerifying || !formData.safeAddress}
                    variant={isVerified ? 'default' : 'outline'}
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Verifying
                      </>
                    ) : isVerified ? (
                      <>
                        <CheckCircle2 className="mr-2 size-4" />
                        Verified
                      </>
                    ) : (
                      'Verify'
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter your Safe wallet address. We'll verify that you're an owner.
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-start gap-3">
                  <AlertCircle className="size-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Error</p>
                    <p className="text-sm mt-1">{error}</p>
                  </div>
                </div>
              )}

              {/* Safe Info */}
              {isVerified && safeInfo && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                  <div className="flex items-start gap-3">
                    <Shield className="size-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-blue-900">Safe Wallet Verified</p>
                      <p className="text-sm text-blue-700 mt-1">
                        Your wallet has been confirmed as an owner. You can now create your organization.
                      </p>
                    </div>
                  </div>
                  <div className="border-t border-blue-200 space-y-2 pt-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-blue-700">Threshold:</span>
                      <span className="font-medium text-blue-900">
                        {safeInfo.threshold} of {safeInfo.owners.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-blue-700">Owners:</span>
                      <span className="font-medium text-blue-900">
                        {safeInfo.owners.length}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={!isVerified || isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Creating Organization...
                  </>
                ) : (
                  'Create Organization'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 space-y-2">
          <p className="text-muted-foreground text-sm">
            Don't have a Safe wallet?{' '}
            <a
              href="https://app.safe.global"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline font-medium"
            >
              Create one here
            </a>
          </p>
          <p className="text-xs text-muted-foreground">
            Safe is a multi-signature wallet that provides secure custody of digital assets
          </p>
        </div>
      </div>
    </div>
  );
}
