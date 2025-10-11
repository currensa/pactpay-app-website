// API Client Usage Examples in React Components
import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import {
  useAuth,
  useOrganizations,
  useCurrentOrganization,
  useSwitchOrganization,
  useEmployees,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
  usePayrolls,
  useCreatePayrollDraft,
  useProposePayroll,
  useTransactions,
  useSafeInfo,
  useSafeBalances,
  useDashboard,
  useApiError,
} from '../hooks/useApiClient';
import { PaymentFrequency, PayrollType } from '../types';

// Example 1: Authentication Component
export function AuthExample() {
  const { isAuthenticated, user, login, logout } = useAuth();
  const [walletAddress, setWalletAddress] = useState('');

  const handleLogin = async () => {
    try {
      await login(walletAddress, 'mock-signature', 'mock-message');
      toast.success('Login successful!');
    } catch (error) {
      toast.error('Login failed');
    }
  };

  if (isAuthenticated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Authenticated User</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Welcome, {user?.walletAddress}</p>
          <Button onClick={logout} variant="outline">
            Logout
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Login</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="wallet">Wallet Address</Label>
          <Input
            id="wallet"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder="0x..."
          />
        </div>
        <Button onClick={handleLogin} disabled={!walletAddress}>
          Login
        </Button>
      </CardContent>
    </Card>
  );
}

// Example 2: Organization Management Component
export function OrganizationExample() {
  const { data: organizations, loading, error } = useOrganizations();
  const { data: currentOrg } = useCurrentOrganization();
  const { switchOrganization, loading: switchLoading } = useSwitchOrganization();

  const handleSwitchOrganization = async (orgId: string) => {
    try {
      await switchOrganization(orgId);
      toast.success('Organization switched successfully!');
    } catch (error) {
      toast.error('Failed to switch organization');
    }
  };

  if (loading) return <div>Loading organizations...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organizations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold">Current Organization:</h3>
            <p>{currentOrg?.name || 'None selected'}</p>
          </div>
          
          <div>
            <h3 className="font-semibold">All Organizations:</h3>
            <div className="space-y-2">
              {organizations?.data.map((org) => (
                <div key={org.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="font-medium">{org.name}</p>
                    <p className="text-sm text-muted-foreground">{org.role}</p>
                  </div>
                  <Button
                    onClick={() => handleSwitchOrganization(org.id)}
                    disabled={switchLoading || org.isCurrent}
                    variant={org.isCurrent ? "default" : "outline"}
                  >
                    {org.isCurrent ? 'Current' : 'Switch'}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Example 3: Employee Management Component
export function EmployeeExample() {
  const { data: employees, loading, error, refetch } = useEmployees({ page: 1, limit: 10 });
  const { createEmployee, loading: createLoading } = useCreateEmployee();
  const { updateEmployee, loading: updateLoading } = useUpdateEmployee();
  const { deleteEmployee, loading: deleteLoading } = useDeleteEmployee();
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    walletAddress: '',
    defaultSalary: '',
    defaultToken: '',
    paymentFrequency: PaymentFrequency.MONTHLY,
  });

  const handleCreateEmployee = async () => {
    try {
      await createEmployee(newEmployee);
      toast.success('Employee created successfully!');
      setNewEmployee({
        name: '',
        walletAddress: '',
        defaultSalary: '',
        defaultToken: '',
        paymentFrequency: PaymentFrequency.MONTHLY,
      });
      refetch();
    } catch (error) {
      toast.error('Failed to create employee');
    }
  };

  const handleUpdateEmployee = async (id: string, updates: any) => {
    try {
      await updateEmployee(id, updates);
      toast.success('Employee updated successfully!');
      refetch();
    } catch (error) {
      toast.error('Failed to update employee');
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    try {
      await deleteEmployee(id);
      toast.success('Employee deleted successfully!');
      refetch();
    } catch (error) {
      toast.error('Failed to delete employee');
    }
  };

  if (loading) return <div>Loading employees...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Employee Management</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Create Employee Form */}
        <div className="space-y-4">
          <h3 className="font-semibold">Add New Employee</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newEmployee.name}
                onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                placeholder="Employee name"
              />
            </div>
            <div>
              <Label htmlFor="wallet">Wallet Address</Label>
              <Input
                id="wallet"
                value={newEmployee.walletAddress}
                onChange={(e) => setNewEmployee({ ...newEmployee, walletAddress: e.target.value })}
                placeholder="0x..."
              />
            </div>
            <div>
              <Label htmlFor="salary">Default Salary</Label>
              <Input
                id="salary"
                value={newEmployee.defaultSalary}
                onChange={(e) => setNewEmployee({ ...newEmployee, defaultSalary: e.target.value })}
                placeholder="5000"
              />
            </div>
            <div>
              <Label htmlFor="token">Default Token</Label>
              <Input
                id="token"
                value={newEmployee.defaultToken}
                onChange={(e) => setNewEmployee({ ...newEmployee, defaultToken: e.target.value })}
                placeholder="0x..."
              />
            </div>
          </div>
          <Button onClick={handleCreateEmployee} disabled={createLoading}>
            {createLoading ? 'Creating...' : 'Create Employee'}
          </Button>
        </div>

        {/* Employee List */}
        <div>
          <h3 className="font-semibold mb-4">Employees ({employees?.data.length || 0})</h3>
          <div className="space-y-2">
            {employees?.data.map((employee) => (
              <div key={employee.id} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <p className="font-medium">{employee.name}</p>
                  <p className="text-sm text-muted-foreground">{employee.walletAddress}</p>
                  <p className="text-sm text-muted-foreground">
                    {employee.defaultSalary} {employee.paymentFrequency}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleUpdateEmployee(employee.id, { isActive: !employee.isActive })}
                    disabled={updateLoading}
                    variant="outline"
                    size="sm"
                  >
                    {employee.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    onClick={() => handleDeleteEmployee(employee.id)}
                    disabled={deleteLoading}
                    variant="destructive"
                    size="sm"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Example 4: Payroll Management Component
export function PayrollExample() {
  const { data: payrolls, loading, error, refetch } = usePayrolls({ page: 1, limit: 10 });
  const { createDraft, loading: createLoading } = useCreatePayrollDraft();
  const { proposePayroll, loading: proposeLoading } = useProposePayroll();
  const [newPayroll, setNewPayroll] = useState({
    safeWalletId: '',
    title: '',
    type: PayrollType.MONTHLY,
    employeeIds: [] as string[],
  });

  const handleCreatePayroll = async () => {
    try {
      await createDraft(newPayroll);
      toast.success('Payroll draft created successfully!');
      setNewPayroll({
        safeWalletId: '',
        title: '',
        type: PayrollType.MONTHLY,
        employeeIds: [],
      });
      refetch();
    } catch (error) {
      toast.error('Failed to create payroll');
    }
  };

  const handleProposePayroll = async (payrollId: string) => {
    try {
      await proposePayroll(payrollId);
      toast.success('Payroll proposed successfully!');
      refetch();
    } catch (error) {
      toast.error('Failed to propose payroll');
    }
  };

  if (loading) return <div>Loading payrolls...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payroll Management</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Create Payroll Form */}
        <div className="space-y-4">
          <h3 className="font-semibold">Create New Payroll</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={newPayroll.title}
                onChange={(e) => setNewPayroll({ ...newPayroll, title: e.target.value })}
                placeholder="October 2024 Payroll"
              />
            </div>
            <div>
              <Label htmlFor="safeWallet">Safe Wallet ID</Label>
              <Input
                id="safeWallet"
                value={newPayroll.safeWalletId}
                onChange={(e) => setNewPayroll({ ...newPayroll, safeWalletId: e.target.value })}
                placeholder="safe-wallet-id"
              />
            </div>
          </div>
          <Button onClick={handleCreatePayroll} disabled={createLoading}>
            {createLoading ? 'Creating...' : 'Create Payroll Draft'}
          </Button>
        </div>

        {/* Payroll List */}
        <div>
          <h3 className="font-semibold mb-4">Payrolls ({payrolls?.data.length || 0})</h3>
          <div className="space-y-2">
            {payrolls?.data.map((payroll) => (
              <div key={payroll.id} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <p className="font-medium">{payroll.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {payroll.type} • {payroll.status} • {payroll.employeeCount} employees
                  </p>
                </div>
                <div className="flex gap-2">
                  {payroll.status === 'DRAFT' && (
                    <Button
                      onClick={() => handleProposePayroll(payroll.id)}
                      disabled={proposeLoading}
                      size="sm"
                    >
                      Propose
                    </Button>
                  )}
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Example 5: Dashboard Component
export function DashboardExample() {
  const { data: dashboard, loading, error } = useDashboard();

  if (loading) return <div>Loading dashboard...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!dashboard) return <div>No dashboard data</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Organization Info */}
      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-medium">{dashboard.organization.name}</p>
          <p className="text-sm text-muted-foreground">ID: {dashboard.organization.id}</p>
        </CardContent>
      </Card>

      {/* Safe Wallet Info */}
      <Card>
        <CardHeader>
          <CardTitle>Safe Wallet</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-mono text-sm">{dashboard.safeWallet.address}</p>
          <p className="text-sm text-muted-foreground">Chain: {dashboard.safeWallet.chainId}</p>
          <div className="mt-2">
            <p className="text-sm font-medium">Balances:</p>
            {dashboard.safeWallet.balances.map((balance, index) => (
              <p key={index} className="text-sm text-muted-foreground">
                {balance.tokenSymbol}: {balance.balance}
              </p>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm">
              <span className="font-medium">Total Employees:</span> {dashboard.statistics.totalEmployees}
            </p>
            <p className="text-sm">
              <span className="font-medium">Payrolls This Month:</span> {dashboard.statistics.totalPayrollsThisMonth}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Pending Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Tasks ({dashboard.pendingTasks.count})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {dashboard.pendingTasks.items.map((task, index) => (
              <div key={index} className="text-sm">
                <p className="font-medium">{task.title}</p>
                <p className="text-muted-foreground">
                  {task.confirmations}/{task.confirmationsRequired} signatures
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity ({dashboard.recentActivity.count})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {dashboard.recentActivity.items.map((activity, index) => (
              <div key={index} className="text-sm">
                <p className="font-medium">{activity.title}</p>
                <p className="text-muted-foreground">
                  {activity.status} • {new Date(activity.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Example 6: Error Handling Component
export function ErrorHandlingExample() {
  const { error, clearError, handleError } = useApiError();
  const [testError, setTestError] = useState(false);

  const triggerError = () => {
    setTestError(true);
    handleError(new Error('This is a test error'));
  };

  useEffect(() => {
    if (testError) {
      const timer = setTimeout(() => {
        setTestError(false);
        clearError();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [testError, clearError]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Error Handling</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={triggerError} variant="destructive">
          Trigger Test Error
        </Button>
        
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-red-800 font-medium">Error:</p>
            <p className="text-red-700">{error}</p>
            <Button onClick={clearError} variant="outline" size="sm" className="mt-2">
              Clear Error
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Main Example Component
export function ApiClientUsageExample() {
  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">API Client Usage Examples</h1>
        <p className="text-muted-foreground">
          Examples of how to use the API client hooks in React components.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AuthExample />
        <OrganizationExample />
        <EmployeeExample />
        <PayrollExample />
        <ErrorHandlingExample />
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
        <DashboardExample />
      </div>
    </div>
  );
}

export default ApiClientUsageExample;
