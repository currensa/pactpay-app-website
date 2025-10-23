// Payrolls Page - List all payroll runs
import { ArrowRight, Loader2, Plus, Receipt, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import Layout from '../components/Layout';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/api-client';
import { formatDate } from '../lib/utils';
import { Payroll, PayrollStatus, PayrollType } from '../types';

export default function PayrollsPage() {
  const { currentOrganization } = useAuth();
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [filter, setFilter] = useState<'all' | PayrollStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | PayrollType>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (currentOrganization) {
      loadPayrolls();
    }
  }, [currentOrganization, filter, typeFilter, page]);

  const loadPayrolls = async () => {
    if (!currentOrganization) return;

    setLoading(true);
    try {
      const params: any = {
        page,
        limit: 10,
      };

      if (filter !== 'all') {
        params.status = filter;
      }

      if (typeFilter !== 'all') {
        params.type = typeFilter;
      }

      const response = await apiClient.getPayrolls(params);
      setPayrolls(response.data);
      setTotalPages(response.pagination.totalPages);
    } catch (error: any) {
      console.error('Failed to load payrolls:', error);
      toast.error('Failed to load payrolls');
    } finally {
      setLoading(false);
    }
  };

  const refreshPayrolls = async () => {
    setRefreshing(true);
    try {
      await loadPayrolls();
      toast.success('Payrolls refreshed');
    } finally {
      setRefreshing(false);
    }
  };

  if (!currentOrganization) {
    return <Layout><div className="p-8">No organization selected</div></Layout>;
  }

  const getStatusVariant = (status: PayrollStatus): 'default' | 'secondary' | 'destructive' => {
    switch (status) {
      case PayrollStatus.EXECUTED:
        return 'default';
      case PayrollStatus.FAILED:
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <Layout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1>Payroll Runs</h1>
            <p className="text-muted-foreground">View and manage all payroll transactions</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="lg"
              onClick={refreshPayrolls}
              disabled={refreshing}
            >
              <RefreshCw className={`mr-2 size-4 ${refreshing ? 'animate-spin' : ''}`} />
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

        {/* Filters */}
        <div className="space-y-3 mb-6">
          <div className="flex gap-2">
            <span className="text-sm text-muted-foreground mr-2 flex items-center">Status:</span>
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setFilter('all');
                setPage(1);
              }}
            >
              All
            </Button>
            <Button
              variant={filter === PayrollStatus.DRAFT ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setFilter(PayrollStatus.DRAFT);
                setPage(1);
              }}
            >
              Draft
            </Button>
            <Button
              variant={filter === PayrollStatus.PROPOSED ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setFilter(PayrollStatus.PROPOSED);
                setPage(1);
              }}
            >
              Proposed
            </Button>
            <Button
              variant={filter === PayrollStatus.EXECUTED ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setFilter(PayrollStatus.EXECUTED);
                setPage(1);
              }}
            >
              Executed
            </Button>
          </div>

          {/* <div className="flex gap-2">
            <span className="text-sm text-muted-foreground mr-2 flex items-center">Type:</span>
            <Button
              variant={typeFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setTypeFilter('all');
                setPage(1);
              }}
            >
              All
            </Button>
            <Button
              variant={typeFilter === PayrollType.MONTHLY ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setTypeFilter(PayrollType.MONTHLY);
                setPage(1);
              }}
            >
              Monthly
            </Button>
            <Button
              variant={typeFilter === PayrollType.ONE_OFF ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setTypeFilter(PayrollType.ONE_OFF);
                setPage(1);
              }}
            >
              One-Time
            </Button>
          </div> */}
        </div>

        {/* Loading State */}
        {loading ? (
          <Card>
            <CardContent className="p-12">
              <div className="flex flex-col items-center justify-center">
                <Loader2 className="size-8 animate-spin text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Loading payrolls...</p>
              </div>
            </CardContent>
          </Card>
        ) : payrolls.length > 0 ? (
          <>
            <div className="flex flex-col gap-4">
              {payrolls.map((payroll) => (
                <Link key={payroll.id} to={`/payrolls/${payroll.id}`}>
                  <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3>{payroll.title || 'Untitled'}</h3>
                            <Badge variant={getStatusVariant(payroll.status || PayrollStatus.DRAFT)}>
                              {payroll.status || 'Unknown'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-muted-foreground">
                            <span>{payroll.employeeCount || 0} employees</span>
                            <span>•</span>
                            <span>{formatDate(payroll.createdAt || new Date().toISOString())}</span>
                            <span>•</span>
                            <span className="capitalize">{payroll.type?.toLowerCase() || 'Unknown'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-muted-foreground mb-1">Total Amount</p>
                            <div className="space-y-1">
                              {Object.entries(payroll.totalAmount || {}).map(([token, amount]) => (
                                <p key={token}>{amount} {token}</p>
                              ))}
                            </div>
                          </div>
                          <ArrowRight className="size-5 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <Button
                      key={p}
                      variant={page === p ? 'default' : 'outline'}
                      onClick={() => setPage(p)}
                      className="w-10"
                    >
                      {p}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="p-12">
              <div className="text-center">
                <Receipt className="size-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="mb-2">No payroll runs found</h3>
                <p className="text-muted-foreground mb-6">
                  {filter === 'all' && typeFilter === 'all'
                    ? "You haven't created any payroll runs yet"
                    : `No payroll runs match the current filters`}
                </p>
                {filter === 'all' && typeFilter === 'all' && (
                  <Link to="/payrolls/create">
                    <Button>
                      <Plus className="mr-2 size-4" />
                      Create Your First Payroll
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
