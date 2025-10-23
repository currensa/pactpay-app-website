// Dashboard - Overview page
import {
  AlertCircle,
  Clock,
  Plus,
  Receipt,
  RefreshCw,
  Users,
  Wallet
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import Layout from '../components/Layout';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { useAuth } from '../contexts/AuthContext';
import type { DashboardOverview } from '../lib/api-client';
import { apiClient } from '../lib/api-client';
import { formatAddress } from '../lib/utils';

export default function DashboardPage() {
  const { currentOrganization, isLoading: authLoading } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasWaitedForAuth, setHasWaitedForAuth] = useState(false);

  // Wait for auth to be fully loaded before checking organization
  useEffect(() => {
    if (!authLoading) {
      const timer = setTimeout(() => {
        setHasWaitedForAuth(true);
      }, 200); // Give auth context time to fully initialize
      return () => clearTimeout(timer);
    }
  }, [authLoading]);

  // Load dashboard data
  useEffect(() => {
    if (hasWaitedForAuth) {
      if (currentOrganization) {
        console.log('Dashboard: Organization found, loading data:', currentOrganization.name);
        loadDashboardData();
      } else {
        console.log('Dashboard: No organization found, showing message');
        // If no organization is selected, show a message
        setIsLoading(false);
      }
    }
  }, [currentOrganization, hasWaitedForAuth]);

  const loadDashboardData = async (showToast = false) => {
    try {
      if (showToast) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      console.log('Loading dashboard data...');
      console.log('API Base URL:', apiClient.getBaseUrl());
      const data = await apiClient.getDashboardOverview();
      console.log('Dashboard data loaded:', data);
      setDashboardData(data);

      if (showToast) {
        toast.success('Dashboard data refreshed');
      }
    } catch (error: any) {
      console.error('Failed to load dashboard data:', error);
      toast.error(error.message || 'Failed to load dashboard data');
      // Set a default dashboard data to prevent infinite loading
      setDashboardData({
        organization: { id: '', name: 'Unknown Organization' },
        safeWallets: [],
        pendingTasks: { count: 0, items: [] },
        recentActivity: { count: 0, items: [] },
        statistics: { totalRecipients: 0, totalPayrollsThisMonth: 0, totalAmountThisMonth: {} }
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadDashboardData(true);
  };

  // Loading state - wait for auth to be fully loaded
  if (authLoading || !hasWaitedForAuth || isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <RefreshCw className="size-12 text-muted-foreground mx-auto mb-4 animate-spin" />
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // No organization selected
  if (!currentOrganization) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <AlertCircle className="size-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No organization selected</p>
            <p className="text-muted-foreground">Please select an organization to view the dashboard</p>
            <Button
              onClick={() => window.location.href = '/select-organization'}
              className="mt-4"
            >
              Select Organization
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  // No dashboard data
  if (!dashboardData) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <AlertCircle className="size-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Failed to load dashboard data</p>
            <Button onClick={handleRefresh} className="mt-4">
              <RefreshCw className="mr-2 size-4" />
              Retry
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const { organization, safeWallets, pendingTasks, recentActivity, statistics } = dashboardData;

  const stats = [
    {
      title: 'Total Recipients',
      value: statistics.totalRecipients?.toString() || '0',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Pending Tasks',
      value: pendingTasks.count.toString(),
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: 'Payrolls This Month',
      value: statistics.totalPayrollsThisMonth.toString(),
      icon: Receipt,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
  ];

  return (
    <Layout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className='text-2xl'>Dashboard</h1>
            <p className="text-muted-foreground">Welcome back to {organization.name}</p>
          </div>
          <div className="flex gap-3">
            <Button
              size="lg"
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`mr-2 size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Link to="/payrolls/create">
              <Button size="lg">
                <Plus className="mr-2 size-4" />
                Create Payroll
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="group hover:shadow-lg transition-all duration-300 border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-sm font-medium">{stat.title}</p>
                      <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                    </div>
                    <div className={`size-14 rounded-xl ${stat.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className={`size-7 ${stat.color}`} />
                    </div>
                  </div>
                  {/* Subtle gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Safe Wallets Card - Bank Card Style */}
          <Card className="overflow-hidden col-span-2">
            {safeWallets && safeWallets.length > 0 ? (
              <div className="space-y-4">
                {safeWallets.map((safeWallet, index) => (
                  <div key={safeWallet.address} className="relative bg-primary text-white rounded-lg overflow-hidden">
                    {/* Card Background Pattern */}
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-16 translate-x-16"></div>
                      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-12 -translate-x-12"></div>
                      <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-white rounded-full"></div>
                    </div>

                    {/* Card Content */}
                    <div className="relative p-6 space-y-6">
                      {/* Card Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                            <Wallet className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold">Safe Wallet #{index + 1}</h3>
                          </div>
                        </div>
                      </div>

                      {/* Card Number */}
                      <div className="space-y-2">
                        <p className="text-slate-300 text-sm">Wallet Address</p>
                        <div className="flex items-center gap-2">
                          <div className="font-mono text-lg tracking-wider">
                            {formatAddress(safeWallet.address)}
                          </div>
                          <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                            <div className="w-3 h-3 bg-white rounded-full"></div>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="flex items-center justify-between pt-4 border-t border-white/20">
                        <div>
                          <p className="text-slate-300 text-xs">Network</p>
                          <p className="font-semibold">Ethereum (Chain ID: {safeWallet.chainId})</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full animate-pulse ${safeWallet.isActive ? 'bg-green-400' : 'bg-red-400'}`}></div>
                          <span className="text-sm text-slate-300">{safeWallet.isActive ? 'Active' : 'Inactive'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Safe Wallets</h3>
                <p className="text-slate-500 mb-4">Connect Safe wallets to start managing payrolls</p>
                <Button variant="outline" className="w-full">
                  <Wallet className="w-4 h-4 mr-2" />
                  Connect Wallet
                </Button>
              </div>
            )}
          </Card>

          {/* Quick Actions */}
          <Card className="h-fit">
            {/* <CardHeader></CardHeader> */}
            <CardContent className="space-y-3">
              <h3 className='mt-3'>Quick Actions</h3>
              <Link to="/employees">
                <Button variant="outline" className="w-full justify-start h-12 group hover:bg-slate-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center mr-3 transition-colors">
                    <Users className="size-4 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">Manage Employees</div>
                    <div className="text-xs text-muted-foreground">Add, edit, and organize team</div>
                  </div>
                </Button>
              </Link>
              <Link to="/payrolls/create">
                <Button variant="outline" className="w-full justify-start h-12 group hover:bg-slate-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-green-100 group-hover:bg-green-200 flex items-center justify-center mr-3 transition-colors">
                    <Plus className="size-4 text-green-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">Create Payroll Run</div>
                    <div className="text-xs text-muted-foreground">Start a new payroll process</div>
                  </div>
                </Button>
              </Link>
              <Link to="/payrolls">
                <Button variant="outline" className="w-full justify-start h-12 group hover:bg-slate-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 group-hover:bg-purple-200 flex items-center justify-center mr-3 transition-colors">
                    <Receipt className="size-4 text-purple-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">View All Payrolls</div>
                    <div className="text-xs text-muted-foreground">Review past and current runs</div>
                  </div>
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Pending Tasks */}
        {pendingTasks.count > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Pending Tasks</CardTitle>
                  <CardDescription>Payrolls awaiting approval or execution</CardDescription>
                </div>
                <Badge variant="secondary">{pendingTasks.count}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {pendingTasks.items.map((task) => (
                  <Link key={task.payrollId} to={`/payrolls/${task.payrollId}`}>
                    <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Clock className="size-4" />
                          <p className="font-medium">{task.title}</p>
                        </div>
                        <p className="text-muted-foreground mt-1">
                          {task.confirmations}/{task.confirmationsRequired} signatures collected
                        </p>
                      </div>
                      <Badge variant="secondary">{task.status}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        {/* <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest payroll transactions</CardDescription>
              </div>
              <Link to="/payrolls">
                <Button variant="ghost">
                  View All
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentActivity.count > 0 ? (
              <div className="space-y-3">
                {recentActivity.items.map((activity) => (
                  <Link key={activity.payrollId} to={`/payrolls/${activity.payrollId}`}>
                    <div className="flex items-center justify-between p-4 bg-muted hover:bg-muted/80 rounded-lg transition-colors">
                      <div className="flex-1">
                        <p className="font-medium">{activity.title}</p>
                        <p className="text-muted-foreground mt-1">
                          {Object.entries(activity.totalAmount)
                            .map(([symbol, amount]) => `${parseFloat(amount).toLocaleString()} ${symbol}`)
                            .join(', ')} • {formatDate(activity.createdAt)}
                        </p>
                      </div>
                      <Badge
                        variant={
                          activity.status === 'EXECUTED'
                            ? 'default'
                            : activity.status === 'FAILED'
                              ? 'destructive'
                              : 'secondary'
                        }
                      >
                        {activity.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Receipt className="size-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No recent activity</p>
                <Link to="/payrolls/create">
                  <Button>
                    <Plus className="mr-2 size-4" />
                    Create Your First Payroll
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card> */}
      </div>
    </Layout>
  );
}
