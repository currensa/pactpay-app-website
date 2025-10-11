// Dashboard - Overview page
import {
  AlertCircle,
  ArrowRight,
  Clock,
  Plus,
  Receipt,
  RefreshCw,
  TrendingUp,
  Users,
  Wallet,
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
import { formatAddress, formatAmount, formatDate } from '../lib/utils';

export default function DashboardPage() {
  const { currentOrganization } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load dashboard data
  useEffect(() => {
    if (currentOrganization) {
      loadDashboardData();
    }
  }, [currentOrganization]);

  const loadDashboardData = async (showToast = false) => {
    try {
      if (showToast) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const data = await apiClient.getDashboardOverview();
      setDashboardData(data);

      if (showToast) {
        toast.success('Dashboard data refreshed');
      }
    } catch (error: any) {
      console.error('Failed to load dashboard data:', error);
      toast.error(error.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadDashboardData(true);
  };

  // Loading state
  if (isLoading || !dashboardData) {
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

  const { organization, safeWallet, pendingTasks, recentActivity, statistics } = dashboardData;

  const stats = [
    {
      title: 'Total Employees',
      value: statistics.totalEmployees.toString(),
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
    {
      title: 'Monthly Amount',
      value: statistics.totalAmountThisMonth
        ? `${formatAmount(statistics.totalAmountThisMonth.amount, 18)} ${statistics.totalAmountThisMonth.symbol}`
        : '$0',
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  return (
    <Layout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1>Dashboard</h1>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground mb-1">{stat.title}</p>
                      <p className="text-2xl">{stat.value}</p>
                    </div>
                    <div className={`size-12 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                      <Icon className={`size-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Safe Wallet Info */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Safe Wallet</CardTitle>
                  <CardDescription>Current balances and information</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {safeWallet ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                    <Wallet className="size-5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-muted-foreground mb-1">Safe Address</p>
                      <p className="font-mono truncate">{formatAddress(safeWallet.address)}</p>
                      <p className="text-muted-foreground mt-1">Chain ID: {safeWallet.chainId}</p>
                    </div>
                  </div>

                  <div>
                    <p className="mb-3">Balances</p>
                    <div className="space-y-2">
                      {safeWallet.balances && safeWallet.balances.length > 0 ? (
                        safeWallet.balances.map((balance, index) => (
                          <div
                            key={`${balance.tokenSymbol}-${index}`}
                            className="flex items-center justify-between p-3 bg-muted rounded-lg"
                          >
                            <div>
                              <p className="font-medium">{balance.tokenSymbol}</p>
                              {balance.fiatBalance && (
                                <p className="text-muted-foreground">≈ ${balance.fiatBalance}</p>
                              )}
                            </div>
                            <p className="font-mono">{balance.balance}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-muted-foreground py-4">
                          No balances found
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="size-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No Safe wallet linked</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to="/employees">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="mr-2 size-4" />
                  Manage Employees
                </Button>
              </Link>
              <Link to="/payrolls/create">
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="mr-2 size-4" />
                  Create Payroll Run
                </Button>
              </Link>
              <Link to="/payrolls">
                <Button variant="outline" className="w-full justify-start">
                  <Receipt className="mr-2 size-4" />
                  View All Payrolls
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
                    <div className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 hover:bg-orange-100 dark:hover:bg-orange-950/30 rounded-lg transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Clock className="size-4 text-orange-600" />
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
        <Card className="mt-6">
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
                          {activity.totalAmount.amount} {activity.totalAmount.symbol} • {formatDate(activity.createdAt)}
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
        </Card>
      </div>
    </Layout>
  );
}
