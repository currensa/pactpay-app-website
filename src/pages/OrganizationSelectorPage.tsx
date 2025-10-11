// Organization Selector Page - Choose organization after login
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Building2, ChevronRight, Plus, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function OrganizationSelectorPage() {
  const { user, getAvailableCompanies, selectCompany } = useAuth();
  const navigate = useNavigate();
  const [switching, setSwitching] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [companies, setCompanies] = useState<Array<{
    id: string;
    name: string;
    role: string;
    memberCount: number;
    employeeCount: number;
    createdAt: string;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const { companies: availableCompanies } = await getAvailableCompanies();
      setCompanies(availableCompanies);

      // If no companies, redirect to onboarding
      if (availableCompanies.length === 0) {
        navigate('/onboarding', { replace: true });
      }
    } catch (error: any) {
      console.error('Failed to load companies:', error);
      toast.error('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOrganization = async (companyId: string) => {
    setSwitching(true);
    setSelectedOrgId(companyId);
    try {
      await selectCompany(companyId);
      toast.success('Organization selected successfully');
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      console.error('Failed to select organization:', error);
      toast.error(error.message || 'Failed to select organization');
    } finally {
      setSwitching(false);
      setSelectedOrgId('');
    }
  };

  const handleCreateNew = () => {
    navigate('/onboarding');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="size-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading organizations...</p>
        </div>
      </div>
    );
  }

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
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Select Organization</h1>
            <p className="text-muted-foreground">
              Choose which organization you'd like to manage
            </p>
            {user?.walletAddress && (
              <p className="text-muted-foreground mt-2">
                Connected as: <span className="font-mono">{user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}</span>
              </p>
            )}
          </div>

          {/* Organizations List */}
          <Card>
            <CardHeader>
              <CardTitle>Your Organizations</CardTitle>
              <CardDescription>
                You have access to {companies.length} organization{companies.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {companies.length > 0 ? (
                <>
                  {companies.map((company) => (
                    <button
                      key={company.id}
                      onClick={() => handleSelectOrganization(company.id)}
                      disabled={switching}
                      className="w-full p-4 bg-muted hover:bg-muted/80 rounded-lg transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="size-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Building2 className="size-6 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{company.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                                {company.role}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {company.memberCount} member{company.memberCount !== 1 ? 's' : ''}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {company.employeeCount} employee{company.employeeCount !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                        </div>
                        {switching && selectedOrgId === company.id ? (
                          <div className="animate-spin size-5 border-2 border-blue-600 border-t-transparent rounded-full" />
                        ) : (
                          <ChevronRight className="size-5 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </>
              ) : (
                <div className="text-center py-8">
                  <Building2 className="size-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No organizations found</p>
                  <p className="text-muted-foreground mb-6">
                    Create your first organization to get started
                  </p>
                </div>
              )}

              {/* Create New Organization Button */}
              <div className="pt-3 border-t">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleCreateNew}
                  disabled={switching}
                >
                  <Plus className="mr-2 size-4" />
                  Create New Organization
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="p-6 text-center text-muted-foreground">
        <p className="text-sm">Powered by Safe{'{Core}'} SDK</p>
      </footer>
    </div>
  );
}

