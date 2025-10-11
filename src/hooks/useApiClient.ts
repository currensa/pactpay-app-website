// React Hook for API Client
import { useState, useCallback, useEffect } from 'react';
import { apiClient, SafePayrollApiClient } from '../lib/api-client';
import {
  User,
  Organization,
  Employee,
  Payroll,
  Transaction,
  SafeWallet,
  TokenBalance,
  PaymentRecord,
  ImportResult,
  PayrollStatus,
  PayrollType,
  PaymentFrequency,
  TransactionStatus,
  OrganizationRole,
} from '../types';
import {
  ApiResponse,
  PaginatedResponse,
  AuthResponse,
  NonceResponse,
  UserInfo,
  OrganizationListResponse,
  OrganizationDetail,
  DashboardOverview,
  SafeInfo,
  SafeBalances,
  SafeOwnerVerification,
  PayrollDraft,
  PayrollDetail,
  TransactionDetail,
} from '../lib/api-client';

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

// Employee Hooks
export function useEmployees(params: {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
} = {}) {
  return useApiState(() => apiClient.getEmployees(params), [
    params.page,
    params.limit,
    params.search,
    params.isActive,
  ]);
}

export function useEmployee(employeeId: string) {
  return useApiState(() => apiClient.getEmployees().then(result => 
    result.data.find(emp => emp.id === employeeId) || null
  ), [employeeId]);
}

export function useEmployeePaymentHistory(employeeId: string, params: {
  page?: number;
  limit?: number;
} = {}) {
  return useApiState(() => apiClient.getEmployeePaymentHistory(employeeId, params), [
    employeeId,
    params.page,
    params.limit,
  ]);
}

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
      const result = await apiClient.createEmployee(data);
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
      const result = await apiClient.updateEmployee(employeeId, data);
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

export function useDeleteEmployee() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteEmployee = useCallback(async (employeeId: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.deleteEmployee(employeeId);
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

export function useImportEmployees() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const importEmployees = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.importEmployees(file);
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
    type: PayrollType;
    employeeIds: string[];
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
        employeeId: string;
        amount: string;
        tokenAddress: string;
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
  useApiState,
};
