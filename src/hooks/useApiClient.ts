// React Hook for API Client
import { useCallback, useEffect, useState } from 'react';
import { apiClient, UserInfo } from '../lib/api-client';
import {
  PaymentFrequency,
  PayrollStatus,
  PayrollType
} from '../types';

// Generic API State Hook
interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Create a generic API state hook
function useApiState<T>(
  apiCall: () => Promise<T>,
  dependencies: any[] = []
): UseApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiCall();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    execute();
  }, [execute]);

  return {
    data,
    loading,
    error,
    refetch: execute,
  };
}

// Authentication Hooks
export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);

  const login = useCallback(async (
    walletAddress: string,
    signature: string,
    message: string
  ) => {
    try {
      const response = await apiClient.login(walletAddress, signature, message);
      setIsAuthenticated(true);
      setUser(response.user);
      return response;
    } catch (error) {
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    apiClient.setAccessToken(null);
    setIsAuthenticated(false);
    setUser(null);
  }, []);

  const getCurrentUser = useCallback(async () => {
    try {
      const userInfo = await apiClient.getCurrentUser();
      setUser(userInfo);
      return userInfo;
    } catch (error) {
      throw error;
    }
  }, []);

  // Check authentication status on mount
  useEffect(() => {
    const token = apiClient.getAccessToken();
    if (token) {
      setIsAuthenticated(true);
      getCurrentUser().catch(() => {
        // Token might be invalid, logout
        logout();
      });
    }
  }, [getCurrentUser, logout]);

  return {
    isAuthenticated,
    user,
    login,
    logout,
    getCurrentUser,
  };
}

// Organization Hooks
export function useOrganizations() {
  return useApiState(() => apiClient.getOrganizations());
}

export function useCurrentOrganization() {
  return useApiState(() => apiClient.getCurrentOrganization());
}

export function useOrganization(organizationId: string) {
  return useApiState(() => apiClient.getOrganization(organizationId), [organizationId]);
}

export function useSwitchOrganization() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const switchOrganization = useCallback(async (organizationId: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.switchOrganization(organizationId);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    switchOrganization,
    loading,
    error,
  };
}

// Payment Recipient Hooks (formerly Employee)
export function usePaymentRecipients(params: {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
} = {}) {
  return useApiState(() => apiClient.getPaymentRecipients(params), [
    params.page,
    params.limit,
    params.search,
    params.isActive,
  ]);
}

// Legacy Employee hooks for backward compatibility
export function useEmployees(params: {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
} = {}) {
  return useApiState(() => apiClient.getPaymentRecipients(params), [
    params.page,
    params.limit,
    params.search,
    params.isActive,
  ]);
}

export function usePaymentRecipient(recipientId: string) {
  return useApiState(() => apiClient.getPaymentRecipients().then(result =>
    result.data.find(recipient => recipient.id === recipientId) || null
  ), [recipientId]);
}

// Legacy Employee hook for backward compatibility
export function useEmployee(employeeId: string) {
  return useApiState(() => apiClient.getPaymentRecipients().then(result =>
    result.data.find(recipient => recipient.id === employeeId) || null
  ), [employeeId]);
}

export function usePaymentRecipientHistory(recipientId: string, params: {
  page?: number;
  limit?: number;
} = {}) {
  return useApiState(() => apiClient.getPaymentRecipientHistory(recipientId, params), [
    recipientId,
    params.page,
    params.limit,
  ]);
}

// Legacy Employee payment history hook for backward compatibility
export function useEmployeePaymentHistory(employeeId: string, params: {
  page?: number;
  limit?: number;
} = {}) {
  return useApiState(() => apiClient.getPaymentRecipientHistory(employeeId, params), [
    employeeId,
    params.page,
    params.limit,
  ]);
}

export function useCreatePaymentRecipient() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPaymentRecipient = useCallback(async (data: {
    name: string;
    walletAddress: string;
    defaultAmount: string;
    tokenId: string;
    chainId: number;
    ensDomain?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.createPaymentRecipient(data);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createPaymentRecipient,
    loading,
    error,
  };
}

// Legacy Employee creation hook for backward compatibility
export function useCreateEmployee() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createEmployee = useCallback(async (data: {
    name: string;
    walletAddress: string;
    defaultSalary: string;
    defaultToken: string;
    paymentFrequency: PaymentFrequency;
  }) => {
    setLoading(true);
    setError(null);
    try {
      // Convert legacy Employee data to PaymentRecipient format
      const recipientData = {
        name: data.name,
        walletAddress: data.walletAddress,
        defaultAmount: data.defaultSalary,
        tokenId: data.defaultToken,
        chainId: 1, // Default to Ethereum mainnet
      };
      const result = await apiClient.createPaymentRecipient(recipientData);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createEmployee,
    loading,
    error,
  };
}

export function useUpdatePaymentRecipient() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updatePaymentRecipient = useCallback(async (
    recipientId: string,
    data: Partial<{
      name: string;
      walletAddress: string;
      defaultAmount: string;
      tokenId: string;
      chainId: number;
      ensDomain?: string;
      isActive: boolean;
    }>
  ) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.updatePaymentRecipient(recipientId, data);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    updatePaymentRecipient,
    loading,
    error,
  };
}

// Legacy Employee update hook for backward compatibility
export function useUpdateEmployee() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateEmployee = useCallback(async (
    employeeId: string,
    data: Partial<{
      name: string;
      walletAddress: string;
      defaultSalary: string;
      defaultToken: string;
      paymentFrequency: PaymentFrequency;
      isActive: boolean;
    }>
  ) => {
    setLoading(true);
    setError(null);
    try {
      // Convert legacy Employee data to PaymentRecipient format
      const recipientData: any = {};
      if (data.name) recipientData.name = data.name;
      if (data.walletAddress) recipientData.walletAddress = data.walletAddress;
      if (data.defaultSalary) recipientData.defaultAmount = data.defaultSalary;
      if (data.defaultToken) recipientData.tokenId = data.defaultToken;
      if (data.isActive !== undefined) recipientData.isActive = data.isActive;

      const result = await apiClient.updatePaymentRecipient(employeeId, recipientData);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    updateEmployee,
    loading,
    error,
  };
}

export function useDeletePaymentRecipient() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deletePaymentRecipient = useCallback(async (recipientId: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.deletePaymentRecipient(recipientId);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    deletePaymentRecipient,
    loading,
    error,
  };
}

// Legacy Employee delete hook for backward compatibility
export function useDeleteEmployee() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteEmployee = useCallback(async (employeeId: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.deletePaymentRecipient(employeeId);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    deleteEmployee,
    loading,
    error,
  };
}

export function useImportPaymentRecipients() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const importPaymentRecipients = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.importPaymentRecipients(file);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    importPaymentRecipients,
    loading,
    error,
  };
}

// Legacy Employee import hook for backward compatibility
export function useImportEmployees() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const importEmployees = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.importPaymentRecipients(file);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    importEmployees,
    loading,
    error,
  };
}

// Payroll Hooks
export function usePayrolls(params: {
  page?: number;
  limit?: number;
  status?: PayrollStatus;
  type?: PayrollType;
} = {}) {
  return useApiState(() => apiClient.getPayrolls(params), [
    params.page,
    params.limit,
    params.status,
    params.type,
  ]);
}

export function usePayroll(payrollId: string) {
  return useApiState(() => apiClient.getPayrollDetail(payrollId), [payrollId]);
}

export function useCreatePayrollDraft() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createDraft = useCallback(async (data: {
    safeWalletId: string;
    title: string;
    paymentRecords: Array<{
      recipientId: string;
      amount?: string;
      notes?: string;
    }>;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.createPayrollDraft(data);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createDraft,
    loading,
    error,
  };
}

export function useUpdatePayrollDraft() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateDraft = useCallback(async (
    payrollId: string,
    data: {
      paymentRecords: Array<{
        recipientId: string;
        amount?: string;
        notes?: string;
      }>;
    }
  ) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.updatePayrollDraft(payrollId, data);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    updateDraft,
    loading,
    error,
  };
}

export function useProposePayroll() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const proposePayroll = useCallback(async (payrollId: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.proposePayroll(payrollId);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    proposePayroll,
    loading,
    error,
  };
}

// Transaction Hooks
export function useTransactions(params: {
  safeWalletId?: string;
  page?: number;
  limit?: number;
} = {}) {
  return useApiState(() => apiClient.getTransactions(params), [
    params.safeWalletId,
    params.page,
    params.limit,
  ]);
}

export function useTransaction(transactionId: string) {
  return useApiState(() => apiClient.getTransactionDetail(transactionId), [transactionId]);
}

export function useSyncTransaction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncTransaction = useCallback(async (transactionId: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.syncTransaction(transactionId);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    syncTransaction,
    loading,
    error,
  };
}

// Safe Wallet Hooks
export function useSafeInfo(address: string, chainId: number) {
  return useApiState(() => apiClient.getSafeInfo(address, chainId), [address, chainId]);
}

export function useSafeBalances(address: string, chainId: number) {
  return useApiState(() => apiClient.getSafeBalances(address, chainId), [address, chainId]);
}

export function useVerifySafeOwner() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifyOwner = useCallback(async (data: {
    safeAddress: string;
    chainId: number;
    userAddress: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.verifySafeOwner(data);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    verifyOwner,
    loading,
    error,
  };
}

// Dashboard Hook
export function useDashboard() {
  return useApiState(() => apiClient.getDashboardOverview());
}

// Utility Hooks
export function useApiClient() {
  return apiClient;
}

export function useApiError() {
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleError = useCallback((err: unknown) => {
    const message = err instanceof Error ? err.message : 'Unknown error';
    setError(message);
  }, []);

  return {
    error,
    clearError,
    handleError,
  };
}

// Export all hooks
export {
  useApiState
};

