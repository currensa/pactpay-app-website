// Payroll Detail Page - View payroll run details and transaction status
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Loader2,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import Layout from '../components/Layout';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { useSafeSDK } from '../hooks/useSafeSDK';
import { apiClient, PayrollDetail as PayrollDetailType } from '../lib/api-client';
import { formatAddress, formatDate } from '../lib/utils';
import { PayrollStatus } from '../types';

export default function PayrollDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { createAndProposeTransaction, isProposing } = useSafeSDK();

  const [payrollDetail, setPayrollDetail] = useState<PayrollDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isProposingToSafe, setIsProposingToSafe] = useState(false);

  useEffect(() => {
    if (id) {
      loadPayrollDetail();
    }
  }, [id]);

  useEffect(() => {
    // Auto-refresh status every 30 seconds for proposed payrolls
    if (payrollDetail && payrollDetail.status === PayrollStatus.PROPOSED) {
      const interval = setInterval(() => {
        refreshStatus();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [payrollDetail]);

  const loadPayrollDetail = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const detail = await apiClient.getPayrollDetail(id);
      setPayrollDetail(detail);
    } catch (error: any) {
      console.error('Failed to load payroll detail:', error);
      toast.error('Failed to load payroll details');
    } finally {
      setLoading(false);
    }
  };

  const refreshStatus = async () => {
    if (!id) return;
    if (!payrollDetail?.transaction) return;

    setIsRefreshing(true);
    try {
      await apiClient.syncTransaction(payrollDetail.transaction.id);
      toast.success('Status updated');

      // Reload payroll detail to get updated info
      await loadPayrollDetail();
    } catch (error: any) {
      console.error('Failed to refresh status:', error);
      toast.error('Failed to refresh status');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCancel = async () => {
    if (!id) return;

    setIsCanceling(true);
    try {
      await apiClient.cancelPayroll(id);
      toast.success('Payroll canceled successfully');
      navigate('/payrolls');
    } catch (error: any) {
      console.error('Failed to cancel payroll:', error);
      toast.error(error.message || 'Failed to cancel payroll');
    } finally {
      setIsCanceling(false);
    }
  };

  const handleDuplicate = async () => {
    if (!id) return;

    setIsDuplicating(true);
    try {
      const duplicated = await apiClient.duplicatePayroll(id);
      toast.success('Payroll duplicated successfully');
      navigate(`/payrolls/${duplicated.id}`);
    } catch (error: any) {
      console.error('Failed to duplicate payroll:', error);
      toast.error(error.message || 'Failed to duplicate payroll');
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleProposeToSafe = async () => {
    if (!id) return;

    setIsProposingToSafe(true);
    try {
      // Step 1: Get transaction data from backend
      console.log('📋 Step 1: Getting transaction data for payroll:', id);
      toast.loading('Preparing transaction data...', { id: 'propose' });
      const transactionData = await apiClient.getPayrollTransactionData(id);
      console.log('✅ Transaction data received:', {
        safeAddress: transactionData.safeAddress,
        chainId: transactionData.chainId,
        transactionCount: transactionData.transactions.length,
      });

      // Step 2: Use Safe SDK to create and propose transaction (frontend only)
      console.log('🔐 Step 2: Creating Safe transaction...');
      toast.loading('Creating Safe transaction...', { id: 'propose' });
      const { safeTxHash, nonce } = await createAndProposeTransaction(transactionData);
      console.log('✅ Safe transaction created:', { safeTxHash, nonce });

      // Step 3: Record transaction hash back to backend
      console.log('💾 Step 3: Recording transaction to backend...');
      toast.loading('Recording transaction...', { id: 'propose' });
      const result = await apiClient.recordPayrollTransaction(id, {
        safeTxHash,
        nonce,
      });
      console.log('✅ Transaction recorded:', {
        payrollId: result.id,
        status: result.status,
        transactionInfo: result.transaction,
      });

      toast.success('Payroll transaction proposed successfully!', { id: 'propose' });

      // Open Safe App in new tab for other signers
      if (result.transaction?.safeAppUrl) {
        console.log('🔗 Opening Safe App:', result.transaction.safeAppUrl);
        window.open(result.transaction.safeAppUrl, '_blank');
      } else {
        console.warn('⚠️ No Safe App URL in response');
      }

      // Reload payroll detail to show updated status
      console.log('🔄 Reloading payroll detail...');
      await loadPayrollDetail();
      console.log('✅ Payroll detail reloaded');
    } catch (error: any) {
      console.error('❌ Failed to propose payroll:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response,
        stack: error.stack,
      });
      toast.error(error.message || 'Failed to create transaction', { id: 'propose' });
    } finally {
      setIsProposingToSafe(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-8 max-w-6xl mx-auto">
          <Card>
            <CardContent className="p-12">
              <div className="flex flex-col items-center justify-center">
                <Loader2 className="size-8 animate-spin text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Loading payroll details...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!payrollDetail) {
    return (
      <Layout>
        <div className="p-8 max-w-6xl mx-auto">
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Payroll not found</p>
              <Link to="/payrolls">
                <Button className="mt-4">Back to Payrolls</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const getStatusIcon = (status: PayrollStatus) => {
    switch (status) {
      case PayrollStatus.EXECUTED:
        return <CheckCircle2 className="size-5 text-green-600" />;
      case PayrollStatus.FAILED:
        return <XCircle className="size-5 text-red-600" />;
      default:
        return <Clock className="size-5 text-orange-600" />;
    }
  };

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

  const confirmationProgress = payrollDetail.transaction
    ? (payrollDetail.transaction.confirmations / payrollDetail.transaction.confirmationsRequired) * 100
    : 0;

  return (
    <Layout>
      <div className="p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate('/payrolls')}>
            <ArrowLeft className="size-4" />
          </Button>
          <div className="flex-1">
            <h1>{payrollDetail.title}</h1>
            <p className="text-muted-foreground">Created on {formatDate(payrollDetail.createdAt)}</p>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(payrollDetail.status)}
            <Badge variant={getStatusVariant(payrollDetail.status)} className="text-base px-4 py-1">
              {payrollDetail.status}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Overview Card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Payroll Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-muted-foreground mb-1">Payment Type</p>
                  <p className="capitalize">{payrollDetail.type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Employees</p>
                  <p>{payrollDetail.employeeCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Created By</p>
                  <p>{formatAddress(payrollDetail.createdBy)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Total Amount</p>
                  <div className="space-y-1">
                    {Object.entries(payrollDetail.totalAmount).map(([token, amount]) => (
                      <p key={token}>
                        {amount} {token}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transaction Status Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Transaction</CardTitle>
                {payrollDetail.transaction && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={refreshStatus}
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {payrollDetail.transaction ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-muted-foreground mb-2">Signatures</p>
                    <div className="space-y-2">
                      <Progress value={confirmationProgress} className="h-2" />
                      <p className="text-sm">
                        {payrollDetail.transaction.confirmations} of {payrollDetail.transaction.confirmationsRequired} required
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Status</p>
                    <Badge variant="outline">{payrollDetail.transaction.status}</Badge>
                  </div>
                  {payrollDetail.transaction.safeAppUrl && (
                    <a
                      href={payrollDetail.transaction.safeAppUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" className="w-full">
                        <ExternalLink className="mr-2 size-4" />
                        Sign in Safe App
                      </Button>
                    </a>
                  )}
                  {payrollDetail.transaction.ethereumTxHash && (
                    <div>
                      <p className="text-muted-foreground mb-1">Transaction Hash</p>
                      <a
                        href={`https://etherscan.io/tx/${payrollDetail.transaction.ethereumTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm break-all"
                      >
                        {formatAddress(payrollDetail.transaction.ethereumTxHash)} <ExternalLink className="inline size-3 ml-1" />
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">No transaction data</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Payment Records */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
            <CardDescription>Individual payment records for this payroll run</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Wallet Address</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Token</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollDetail.paymentRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{record.employeeName}</TableCell>
                    <TableCell>{formatAddress(record.recipientAddress)}</TableCell>
                    <TableCell>{record.amount}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{record.tokenSymbol}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          record.status === 'COMPLETED'
                            ? 'default'
                            : record.status === 'FAILED'
                              ? 'destructive'
                              : 'secondary'
                        }
                      >
                        {record.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="mt-6 flex justify-between gap-2">
          <div className="flex gap-2">
            {/* Duplicate Button - Available for all statuses */}
            <Button
              variant="outline"
              onClick={handleDuplicate}
              disabled={isDuplicating}
            >
              {isDuplicating ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Copy className="mr-2 size-4" />
              )}
              Duplicate
            </Button>

            {/* Cancel Button - Only for DRAFT and PROPOSED */}
            {(payrollDetail.status === PayrollStatus.DRAFT ||
              payrollDetail.status === PayrollStatus.PROPOSED) && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" disabled={isCanceling}>
                      {isCanceling ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : (
                        <XCircle className="mr-2 size-4" />
                      )}
                      Cancel Payroll
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will cancel the payroll run. This action cannot be undone.
                        {payrollDetail.status === PayrollStatus.PROPOSED && (
                          <span className="block mt-2 text-yellow-600">
                            Note: The Safe transaction will still exist and need to be rejected manually.
                          </span>
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>No, keep it</AlertDialogCancel>
                      <AlertDialogAction onClick={handleCancel}>
                        Yes, cancel payroll
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
          </div>

          {/* Propose to Safe Button - Only for DRAFT */}
          {payrollDetail.status === PayrollStatus.DRAFT && (
            <Button
              onClick={handleProposeToSafe}
              disabled={isProposingToSafe || isProposing}
              size="lg"
            >
              {isProposingToSafe || isProposing ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <ExternalLink className="mr-2 size-4" />
              )}
              Propose to Safe
            </Button>
          )}
        </div>
      </div>
    </Layout>
  );
}
