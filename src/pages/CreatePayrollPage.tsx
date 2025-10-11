// Create Payroll Page - Create new payroll run with real API
import Layout from '@/components/Layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { usePayrollProposal } from '@/hooks/usePayrollProposal';
import { apiClient } from '@/lib/api-client';
import type { Employee } from '@/types';
import { PayrollType } from '@/types';
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Loader2, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface SelectedEmployee extends Employee {
  selected: boolean;
  customAmount: string;
}

const STEPS = [
  { number: 1, title: 'Basic Information', description: 'Set payroll title and type' },
  { number: 2, title: 'Select Employees', description: 'Choose who to pay' },
  { number: 3, title: 'Review Amounts', description: 'Adjust payment amounts' },
  { number: 4, title: 'Review & Submit', description: 'Confirm and create transaction' },
];

export default function CreatePayrollPage() {
  const { currentOrganization } = useAuth();
  const navigate = useNavigate();
  const { proposePayroll, isProposing } = usePayrollProposal();

  // Step state
  const [step, setStep] = useState(1);

  // Form data
  const [title, setTitle] = useState('');
  const [type, setType] = useState<PayrollType>(PayrollType.MONTHLY);
  const [safeWalletId, setSafeWalletId] = useState('');
  const [safeWallets, setSafeWallets] = useState<any[]>([]);

  // Employees
  const [employees, setEmployees] = useState<SelectedEmployee[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);

  // Payroll draft
  const [draftId, setDraftId] = useState<string | null>(null);

  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Load organization safe wallets
  useEffect(() => {
    if (currentOrganization) {
      loadOrganizationData();
    }
  }, [currentOrganization]);

  // Load employees when step changes to 2
  useEffect(() => {
    if (step === 2 && employees.length === 0) {
      loadEmployees();
    }
  }, [step]);

  const loadOrganizationData = async () => {
    try {
      const orgData = await apiClient.getCurrentOrganization();
      setSafeWallets(orgData.safeWallets.filter(w => w.isActive));

      // Set default safe wallet
      const activeSafe = orgData.safeWallets.find(w => w.isActive);
      if (activeSafe) {
        setSafeWalletId(activeSafe.id);
      }

      // Set default title
      const now = new Date();
      setTitle(`${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()} Payroll`);
    } catch (error: any) {
      console.error('Failed to load organization:', error);
      toast.error('Failed to load organization data');
    }
  };

  const loadEmployees = async () => {
    setIsLoadingEmployees(true);
    try {
      const response = await apiClient.getEmployees({ isActive: true, limit: 100 });
      setEmployees(
        response.data.map((emp) => ({
          ...emp,
          selected: false,
          customAmount: emp.defaultSalary,
        }))
      );
    } catch (error: any) {
      console.error('Failed to load employees:', error);
      toast.error('Failed to load employees');
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  // Employee selection
  const toggleEmployee = (id: string) => {
    setEmployees((prev) =>
      prev.map((emp) => (emp.id === id ? { ...emp, selected: !emp.selected } : emp))
    );
  };

  const toggleAll = () => {
    const allSelected = employees.every((e) => e.selected);
    setEmployees((prev) => prev.map((emp) => ({ ...emp, selected: !allSelected })));
  };

  const updateEmployeeAmount = (id: string, amount: string) => {
    setEmployees((prev) =>
      prev.map((emp) => (emp.id === id ? { ...emp, customAmount: amount } : emp))
    );
  };

  // Calculations
  const selectedEmployees = employees.filter((e) => e.selected);

  const calculateTotals = () => {
    const totals: Record<string, { amount: number; symbol: string }> = {};
    selectedEmployees.forEach((emp) => {
      const symbol = emp.defaultTokenSymbol || 'ETH';
      if (!totals[symbol]) {
        totals[symbol] = { amount: 0, symbol };
      }
      totals[symbol].amount += parseFloat(emp.customAmount || '0');
    });
    return Object.values(totals);
  };

  // Navigation
  const handleNext = async () => {
    setError('');

    if (step === 1) {
      // Validate basic info
      if (!title.trim()) {
        setError('Please enter a payroll title');
        return;
      }
      if (!safeWalletId) {
        setError('Please select a Safe wallet');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      // Validate employee selection
      if (selectedEmployees.length === 0) {
        setError('Please select at least one employee');
        return;
      }

      // Create draft
      setIsSubmitting(true);
      try {
        const draft = await apiClient.createPayrollDraft({
          safeWalletId,
          title,
          type,
          employeeIds: selectedEmployees.map((e) => e.id),
        });
        setDraftId(draft.id);
        toast.success('Payroll draft created');
        setStep(3);
      } catch (error: any) {
        console.error('Failed to create draft:', error);
        setError(error.message || 'Failed to create payroll draft');
        toast.error('Failed to create payroll draft');
      } finally {
        setIsSubmitting(false);
      }
    } else if (step === 3) {
      // Update draft with custom amounts
      if (!draftId) return;

      setIsSubmitting(true);
      try {
        const paymentRecords = selectedEmployees.map((emp) => ({
          employeeId: emp.id,
          amount: emp.customAmount,
          tokenAddress: emp.defaultToken,
        }));

        await apiClient.updatePayrollDraft(draftId, { paymentRecords });
        toast.success('Amounts updated');
        setStep(4);
      } catch (error: any) {
        console.error('Failed to update draft:', error);
        setError(error.message || 'Failed to update amounts');
        toast.error('Failed to update amounts');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    setError('');
    if (step > 1) {
      setStep(step - 1);
    }
  };

  // Submit to Safe (Backend-Driven Flow)
  const handleSubmit = async () => {
    if (!draftId) {
      console.error('❌ No draft ID found');
      return;
    }

    console.log('🚀 Starting payroll proposal process for draft:', draftId);
    setIsSubmitting(true);
    try {
      // Use the new backend-driven flow:
      // 1. Backend creates Safe transaction and returns safeTxHash
      // 2. Frontend signs the safeTxHash
      // 3. Backend proposes to Safe Transaction Service
      const result = await proposePayroll(draftId);

      console.log('✅ Transaction proposed successfully:', {
        payrollId: result.id,
        status: result.status,
        transactionInfo: result.transaction,
      });

      // Open Safe App in new tab for other signers
      if (result.transaction?.safeAppUrl) {
        console.log('🔗 Opening Safe App:', result.transaction.safeAppUrl);
        window.open(result.transaction.safeAppUrl, '_blank');
      } else {
        console.warn('⚠️ No Safe App URL in response');
      }

      // Navigate to payroll detail page
      console.log('📍 Navigating to payroll detail page:', result.id);
      navigate(`/payrolls/${result.id}`);
    } catch (error: any) {
      console.error('❌ Failed to propose payroll:', error);
      setError(error.message || 'Failed to create transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentOrganization) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <Card>
            <CardHeader>
              <CardTitle>No Organization Selected</CardTitle>
              <CardDescription>Please select an organization to create payroll</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate('/payrolls')} className="mb-4">
            <ArrowLeft className="mr-2 size-4" />
            Back to Payrolls
          </Button>
          <h1>Create New Payroll</h1>
          <p className="text-muted-foreground">
            Create a batch payment for your team members
          </p>
        </div>

        {/* Steps Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((s, index) => (
              <div key={s.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`size-10 rounded-full flex items-center justify-center border-2 transition-colors ${step > s.number
                      ? 'bg-primary border-primary text-primary-foreground'
                      : step === s.number
                        ? 'border-primary text-primary'
                        : 'border-muted-foreground/30 text-muted-foreground'
                      }`}
                  >
                    {step > s.number ? (
                      <CheckCircle2 className="size-5" />
                    ) : (
                      <span className="font-medium">{s.number}</span>
                    )}
                  </div>
                  <div className="text-center mt-2">
                    <p
                      className={`font-medium ${step >= s.number ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                    >
                      {s.title}
                    </p>
                    <p className="text-muted-foreground">{s.description}</p>
                  </div>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-4 transition-colors ${step > s.number ? 'bg-primary' : 'bg-muted-foreground/30'
                      }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="size-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Error</p>
                <p className="text-destructive">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step Content */}
        <Card>
          <CardContent className="p-6">
            {/* Step 1: Basic Information */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="mb-4">Payroll Details</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title">Payroll Title *</Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., January 2024 Payroll"
                      />
                    </div>

                    <div>
                      <Label htmlFor="type">Payment Type</Label>
                      <Select value={type} onValueChange={(v: PayrollType) => setType(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={PayrollType.MONTHLY}>Monthly Payroll</SelectItem>
                          <SelectItem value={PayrollType.ONE_OFF}>One-time Payment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="safeWallet">Safe Wallet *</Label>
                      <Select value={safeWalletId} onValueChange={setSafeWalletId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Safe wallet" />
                        </SelectTrigger>
                        <SelectContent>
                          {safeWallets.map((wallet) => (
                            <SelectItem key={wallet.id} value={wallet.id}>
                              {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)} (Chain:{' '}
                              {wallet.chainId})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Select Employees */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3>Select Employees to Pay</h3>
                  <Button variant="outline" size="sm" onClick={toggleAll}>
                    {employees.every((e) => e.selected) ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>

                {isLoadingEmployees ? (
                  <div className="text-center py-12">
                    <Loader2 className="size-12 text-muted-foreground mx-auto mb-4 animate-spin" />
                    <p className="text-muted-foreground">Loading employees...</p>
                  </div>
                ) : employees.length > 0 ? (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {employees.map((employee) => (
                      <div
                        key={employee.id}
                        className={`flex items-center justify-between p-4 rounded-lg border transition-colors cursor-pointer ${employee.selected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted'
                          }`}
                        onClick={() => toggleEmployee(employee.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={employee.selected}
                            onCheckedChange={() => toggleEmployee(employee.id)}
                          />
                          <div>
                            <p className="font-medium">{employee.name}</p>
                            <p className="text-muted-foreground font-mono">
                              {employee.walletAddress.slice(0, 6)}...
                              {employee.walletAddress.slice(-4)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {employee.defaultSalary} {employee.defaultTokenSymbol || 'ETH'}
                          </p>
                          <Badge variant="outline">
                            {employee.paymentFrequency === 'MONTHLY' ? 'Monthly' : 'One-off'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">No active employees found</p>
                    <Button variant="outline" onClick={() => navigate('/employees')}>
                      Add Employees
                    </Button>
                  </div>
                )}

                {selectedEmployees.length > 0 && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="font-medium">
                      {selectedEmployees.length} employee{selectedEmployees.length !== 1 ? 's' : ''}{' '}
                      selected
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Review Amounts */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="mb-4">Adjust Payment Amounts</h3>
                  <p className="text-muted-foreground mb-4">
                    Review and adjust the payment amount for each employee
                  </p>
                </div>

                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {selectedEmployees.map((employee) => (
                    <div key={employee.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{employee.name}</p>
                        <p className="text-muted-foreground font-mono">
                          {employee.walletAddress.slice(0, 6)}...{employee.walletAddress.slice(-4)}
                        </p>
                      </div>
                      <div className="w-48">
                        <Input
                          type="number"
                          value={employee.customAmount}
                          onChange={(e) => updateEmployeeAmount(employee.id, e.target.value)}
                          placeholder="Amount"
                          step="0.01"
                        />
                      </div>
                      <div className="w-16 text-right">
                        <p className="text-muted-foreground">
                          {employee.defaultTokenSymbol || 'ETH'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <p className="font-medium">Payment Summary</p>
                  {calculateTotals().map((total) => (
                    <div key={total.symbol} className="flex justify-between">
                      <span className="text-muted-foreground">Total {total.symbol}:</span>
                      <span className="font-medium">
                        {total.amount.toFixed(6)} {total.symbol}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-muted-foreground">Recipients:</span>
                    <span className="font-medium">{selectedEmployees.length}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Review & Submit */}
            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h3 className="mb-2">Review Payroll</h3>
                  <p className="text-muted-foreground">
                    Please review all details before submitting to Safe
                  </p>
                </div>

                {/* Payroll Info */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-muted-foreground mb-1">Title</p>
                      <p className="font-medium">{title}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Type</p>
                      <Badge>{type === PayrollType.MONTHLY ? 'Monthly' : 'One-time'}</Badge>
                    </div>
                  </div>

                  {/* Payment Summary */}
                  <div className="p-4 bg-muted rounded-lg space-y-3">
                    <p className="font-medium">Payment Summary</p>
                    <div className="space-y-2">
                      {calculateTotals().map((total) => (
                        <div key={total.symbol} className="flex justify-between">
                          <span className="text-muted-foreground">Total {total.symbol}:</span>
                          <span className="font-medium text-lg">
                            {total.amount.toFixed(6)} {total.symbol}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between pt-2 border-t">
                        <span className="text-muted-foreground">Total Recipients:</span>
                        <span className="font-medium">{selectedEmployees.length}</span>
                      </div>
                    </div>
                  </div>

                  {/* Employees List */}
                  <div>
                    <p className="font-medium mb-2">Recipients</p>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {selectedEmployees.map((employee) => (
                        <div
                          key={employee.id}
                          className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        >
                          <span>{employee.name}</span>
                          <span className="font-mono">
                            {employee.customAmount} {employee.defaultTokenSymbol || 'ETH'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Warning */}
                <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
                  <CardContent className="p-4 flex items-start gap-3">
                    <AlertCircle className="size-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-orange-900 dark:text-orange-100">
                        Transaction will require signatures
                      </p>
                      <p className="text-orange-800 dark:text-orange-200 mt-1">
                        After submission, this payroll will create a Safe transaction that requires
                        the configured number of owner signatures before execution.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-6">
          <Button variant="outline" onClick={handleBack} disabled={step === 1 || isSubmitting}>
            <ArrowLeft className="mr-2 size-4" />
            Back
          </Button>

          {step < 4 ? (
            <Button onClick={handleNext} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="ml-2 size-4" />
                </>
              )}
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting || isProposing}>
              {isSubmitting || isProposing ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {isProposing ? 'Proposing to Safe...' : 'Creating Transaction...'}
                </>
              ) : (
                <>
                  <Send className="mr-2 size-4" />
                  Submit to Safe
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </Layout>
  );
}
