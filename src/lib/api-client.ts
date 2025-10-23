// API Client for Safe Payroll System
import {
  PaymentRecipient,
  PaymentRecord,
  Payroll,
  PayrollStatus,
  PayrollType,
  TokenBalance,
  Transaction
} from '../types';

import { SafeTransaction } from '@safe-global/types-kit';



// API Response Types
export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  success?: boolean;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AuthResponse {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  user: {
    id: string;
    address: string;
    ensName: string | null;
    role: "enterprise_admin";
    hasCompanies: boolean;
    needsCompanySelection: boolean;
  };
}

export interface NonceResponse {
  nonce: string;
  message: string;
}

export interface UserInfo {
  id: string;
  walletAddress: string;
  email?: string;
  currentOrganization?: {
    id: string;
    name: string;
    role: string;
  };
  needsCompanySelection?: boolean;
}

export interface SafeWallet {
  address: string;
  chainId: number;
  isActive: boolean;
}

export interface Organization {
  id: string;
  name: string;
  email: string;
  role: string;
  isCurrent: boolean;
  safeWallets: SafeWallet[];
}

export interface OrganizationListResponse {
  data: Organization[];
}

export interface AvailableCompaniesResponse {
  companies: Array<{
    id: string;
    name: string;
    role: string;
    memberCount: number;
    employeeCount: number;
    createdAt: string;
  }>;
  total: number;
  lastSelectedCompanyId: string | null;
}

export interface SelectCompanyResponse {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  company: {
    id: string;
    name: string;
    role: string;
  };
  redirectTo: string;
}

export interface SessionInfo {
  user: {
    id: string;
    address: string;
    ensName: string | null;
  };
  currentCompany: {
    id: string;
    name: string;
    role: string;
  } | null;
  availableCompanies: Array<{
    id: string;
    name: string;
    role: string;
  }>;
}

export interface OrganizationDetail {
  id: string;
  name: string;
  email: string;
  role: string;
  safeWallets: Array<{
    id: string;
    address: string;
    chainId: number;
    threshold: number;
    owners: string[];
    isActive: boolean;
  }>;
  members: Array<{
    userId: string;
    walletAddress: string;
    role: string;
    joinedAt: string;
  }>;
}

export interface DashboardOverview {
  organization: {
    id: string;
    name: string;
  };
  safeWallets: SafeWallet[];
  pendingTasks: {
    count: number;
    items: Array<{
      payrollId: string;
      title: string;
      status: string;
      confirmations: number;
      confirmationsRequired: number;
    }>;
  };
  // recentActivity: {
  //   count: number;
  //   items: Array<{
  //     payrollId: string;
  //     title: string;
  //     status: string;
  //     totalAmount: Record<string, string>;
  //     createdAt: string;
  //     executedAt?: string;
  //   }>;
  // };
  statistics: {
    totalRecipients: number;
    totalPayrollsThisMonth: number;
    totalAmountThisMonth: Record<string, string>;
  };
}

export interface SafeInfo {
  address: string;
  chainId: number;
  threshold: number;
  owners: string[];
  nonce: number;
}

export interface SafeBalances {
  balances: TokenBalance[];
}

export interface SafeOwnerVerification {
  isOwner: boolean;
  threshold: number;
  owners: string[];
}

export interface PayrollDraft {
  id: string;
  title: string;
  status: 'DRAFT';
  paymentRecords: Array<{
    recipientId: string;
    recipientName: string;
    recipientAddress: string;
    amount: string;
    status: string;
    notes?: string;
  }>;
  totalAmount: Record<string, string>;
}

export interface PayrollDetail extends Payroll {
  paymentRecords: PaymentRecord[];
  transaction?: {
    id: string; // Transaction UUID from backend
    safeTxHash: string;
    ethereumTxHash?: string;
    status: string;
    confirmations: number;
    confirmationsRequired: number;
    signatures: Array<{
      signerAddress: string;
      signedAt: string;
    }>;
    safeAppUrl: string;
  };
}

export interface TransactionDetail extends Transaction {
  signatures: Array<{
    signerAddress: string;
    signedAt: string;
  }>;
  safeAppUrl: string;
}

export interface RawTransactionData {
  to: string;
  value: string;
  data: string;
}

export interface CreateTransactionResponse {
  // Safe 信息
  safeAddress: string;
  chainId: number;
  threshold: number;
  owners: string[];
  nonce: number;

  // 原始交易数据（供前端构造 Safe 交易）
  rawTransactions: Array<{
    to: string;
    value: string;
    data: string;
  }>;

  // 薪资单信息
  payrollId: string;
  totalAmount: number;
  paymentCount: number;
}

// API Client Configuration
export interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
}

// API Client Class
export class SafePayrollApiClient {
  private baseUrl: string;
  private timeout: number;
  private accessToken: string | null = null;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl;
    this.timeout = config.timeout || 30000;
  }

  // Token Management
  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  // HTTP Request Helper
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Check for new token in response headers (organization switch)
      const newToken = response.headers.get('X-New-Token');
      if (newToken) {
        this.setAccessToken(newToken);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        throw error;
      }
      throw new Error('Unknown error occurred');
    }
  }

  // Auth API Methods
  async getNonce(walletAddress: string): Promise<NonceResponse> {
    return this.request<NonceResponse>(`/api/enterprise/auth/nonce?walletAddress=${encodeURIComponent(walletAddress)}`);
  }

  async login(walletAddress: string, signature: string, message: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/api/enterprise/auth/login', {
      method: 'POST',
      body: JSON.stringify({ walletAddress, signature, message }),
    });

    // Set token automatically after login
    if (response.accessToken) {
      this.setAccessToken(response.accessToken);
    }

    return response;
  }

  async getCurrentUser(): Promise<UserInfo> {
    return this.request<UserInfo>('/api/enterprise/auth/me');
  }

  // Organization API Methods
  async createOrganization(data: {
    name: string;
    email: string;
    safeAddress: string;
    chainId: number;
  }): Promise<{
    id: string;
    name: string;
    email: string;
    safeWallet: {
      address: string;
      chainId: number;
      threshold: number;
      owners: string[];
    };
    role: 'ADMIN';
  }> {
    const response = await this.request<{
      id: string;
      name: string;
      email: string;
      safeWallet: {
        address: string;
        chainId: number;
        threshold: number;
        owners: string[];
      };
      role: 'ADMIN';
    }>('/api/enterprise/organizations', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    return response;
  }

  async getOrganizations(): Promise<OrganizationListResponse> {
    return this.request<OrganizationListResponse>('/api/enterprise/organizations');
  }

  // Get available companies (for first-time selection after login)
  async getAvailableCompanies(): Promise<AvailableCompaniesResponse> {
    return this.request<AvailableCompaniesResponse>('/api/enterprise/companies/available');
  }

  // Select organization (unified method for both first-time selection and switching)
  async switchOrganization(organizationId: string): Promise<SelectCompanyResponse> {
    const response = await this.request<SelectCompanyResponse>('/api/enterprise/session/switch-organization', {
      method: 'POST',
      body: JSON.stringify({ organizationId }),
    });

    // Update token after organization selection
    if (response.accessToken) {
      this.setAccessToken(response.accessToken);
    }

    return response;
  }

  // Get current session information
  async getSession(): Promise<SessionInfo> {
    return this.request<SessionInfo>('/api/enterprise/session');
  }

  async getOrganization(organizationId: string): Promise<OrganizationDetail> {
    return this.request<OrganizationDetail>(`/api/enterprise/organizations/${organizationId}`);
  }

  async getCurrentOrganization(): Promise<OrganizationDetail> {
    return this.request<OrganizationDetail>('/api/enterprise/organization');
  }

  async addSafeWallet(data: {
    address: string;
    chainId: number;
  }): Promise<{
    id: string;
    address: string;
    chainId: number;
    threshold: number;
    owners: string[];
  }> {
    return this.request<{
      id: string;
      address: string;
      chainId: number;
      threshold: number;
      owners: string[];
    }>('/api/enterprise/organization/safe-wallets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async addAdmin(data: {
    walletAddress: string;
  }): Promise<{
    success: boolean;
    member: {
      userId: string;
      walletAddress: string;
      role: 'ADMIN';
    };
  }> {
    return this.request<{
      success: boolean;
      member: {
        userId: string;
        walletAddress: string;
        role: 'ADMIN';
      };
    }>('/api/enterprise/organization/admins', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Payment Recipient API Methods (formerly Employee)
  async getPaymentRecipients(params: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
  } = {}): Promise<PaginatedResponse<PaymentRecipient>> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.search) searchParams.set('search', params.search);
    if (params.isActive !== undefined) searchParams.set('isActive', params.isActive.toString());

    const query = searchParams.toString();
    return this.request<PaginatedResponse<PaymentRecipient>>(`/api/enterprise/employees${query ? `?${query}` : ''}`);
  }

  async createPaymentRecipient(data: {
    name: string;
    walletAddress: string;
    defaultAmount: string;
    tokenId: string;
    chainId: number;
    ensDomain?: string;
  }): Promise<PaymentRecipient> {
    return this.request<PaymentRecipient>('/api/enterprise/employees', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePaymentRecipient(recipientId: string, data: Partial<{
    name: string;
    walletAddress: string;
    defaultAmount: string;
    tokenId: string;
    chainId: number;
    ensDomain?: string;
    isActive: boolean;
  }>): Promise<PaymentRecipient> {
    return this.request<PaymentRecipient>(`/api/enterprise/employees/${recipientId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deletePaymentRecipient(recipientId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/enterprise/employees/${recipientId}`, {
      method: 'DELETE',
    });
  }

  async getPaymentRecipientHistory(recipientId: string, params: {
    page?: number;
    limit?: number;
  } = {}): Promise<PaginatedResponse<{
    id: string;
    payrollId: string;
    payrollTitle: string;
    amount: string;
    status: string;
    notes?: string;
    createdAt: string;
  }>> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());

    const query = searchParams.toString();
    return this.request<PaginatedResponse<{
      id: string;
      payrollId: string;
      payrollTitle: string;
      amount: string;
      status: string;
      notes?: string;
      createdAt: string;
    }>>(`/api/enterprise/employees/${recipientId}/payment-history${query ? `?${query}` : ''}`);
  }

  async importPaymentRecipients(file: File): Promise<{
    success: number;
    failed: number;
    errors: Array<{
      row: number;
      error: string;
    }>;
  }> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request<{
      success: number;
      failed: number;
      errors: Array<{
        row: number;
        error: string;
      }>;
    }>('/api/enterprise/employees/import', {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    });
  }

  async exportPaymentRecipients(): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/api/enterprise/employees/export`, {
      headers: this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {},
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.blob();
  }

  // Payroll API Methods
  async getPayrolls(params: {
    page?: number;
    limit?: number;
    status?: PayrollStatus;
    type?: PayrollType;
  } = {}): Promise<PaginatedResponse<Payroll>> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.status) searchParams.set('status', params.status);
    if (params.type) searchParams.set('type', params.type);

    const query = searchParams.toString();
    return this.request<PaginatedResponse<Payroll>>(`/api/enterprise/payrolls${query ? `?${query}` : ''}`);
  }

  async createPayrollDraft(data: {
    safeWalletId: string;
    title: string;
    paymentRecords: Array<{
      recipientId: string;
      amount: string;  // Required: string representation of bigint amount
      notes?: string;   // Optional: notes
    }>;
  }): Promise<PayrollDraft> {
    return this.request<PayrollDraft>('/api/enterprise/payrolls/draft', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePayrollDraft(payrollId: string, data: {
    paymentRecords: Array<{
      recipientId: string;
      amount: string;  // Required: string representation of bigint amount
      notes?: string;
    }>;
  }): Promise<PayrollDraft> {
    return this.request<PayrollDraft>(`/api/enterprise/payrolls/${payrollId}/draft`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * Get transaction data for frontend to construct Safe transaction
   * Backend returns raw transaction data, frontend uses Safe SDK to construct
   * @param payrollId - The payroll ID
   * @param walletAddress - The wallet address for signing (must be Safe owner)
   */
  async getPayrollTransactionData(payrollId: string): Promise<CreateTransactionResponse> {
    return this.request<CreateTransactionResponse>(`/api/enterprise/payrolls/${payrollId}/transaction-data`, {
      method: 'GET',
    });
  }

  /**
   * Submit signature and propose transaction (backend proposes to Safe Transaction Service)
   */
  async submitPayrollSignature(payrollId: string, data: {
    safeTxHash: string;
    signature: string;
    signerAddress: string;
    safeTransactionData: SafeTransaction['data'];
  }): Promise<{
    id: string;
    status: 'PROPOSED';
    transaction: {
      safeTxHash: string;
      nonce: number;
      confirmations: number;
      confirmationsRequired: number;
      safeAppUrl: string;
    };
  }> {
    return this.request(`/api/enterprise/payrolls/${payrollId}/submit-signature`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPayrollDetail(payrollId: string): Promise<PayrollDetail> {
    return this.request<PayrollDetail>(`/api/enterprise/payrolls/${payrollId}`);
  }

  async duplicatePayroll(payrollId: string): Promise<PayrollDraft> {
    return this.request<PayrollDraft>(`/api/enterprise/payrolls/${payrollId}/duplicate`, {
      method: 'POST',
    });
  }

  async cancelPayroll(payrollId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/enterprise/payrolls/${payrollId}/cancel`, {
      method: 'POST',
    });
  }

  // Transaction API Methods
  async getTransactions(params: {
    safeWalletId?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<PaginatedResponse<Transaction>> {
    const searchParams = new URLSearchParams();
    if (params.safeWalletId) searchParams.set('safeWalletId', params.safeWalletId);
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());

    const query = searchParams.toString();
    return this.request<PaginatedResponse<Transaction>>(`/api/enterprise/transactions${query ? `?${query}` : ''}`);
  }

  async getTransactionDetail(transactionId: string): Promise<TransactionDetail> {
    return this.request<TransactionDetail>(`/api/enterprise/transactions/${transactionId}`);
  }

  async syncTransaction(transactionId: string): Promise<{
    status: string;
    confirmations: number;
    ethereumTxHash?: string;
  }> {
    return this.request<{
      status: string;
      confirmations: number;
      ethereumTxHash?: string;
    }>(`/api/enterprise/transactions/${transactionId}/sync`, {
      method: 'POST',
    });
  }

  // Safe API Methods
  async getSafeInfo(address: string, chainId: number): Promise<SafeInfo> {
    return this.request<SafeInfo>(`/api/enterprise/safe/${address}/info?chainId=${chainId}`);
  }

  async getSafeBalances(address: string, chainId: number): Promise<SafeBalances> {
    return this.request<SafeBalances>(`/api/enterprise/safe/${address}/balances?chainId=${chainId}`);
  }

  async verifySafeOwner(data: {
    safeAddress: string;
    chainId: number;
    userAddress: string;
  }): Promise<SafeOwnerVerification> {
    return this.request<SafeOwnerVerification>('/api/enterprise/safe/verify-owner', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Dashboard API Methods
  async getDashboardOverview(): Promise<DashboardOverview> {
    return this.request<DashboardOverview>('/api/enterprise/dashboard/overview');
  }

  // Token API Methods
  async getTokens(): Promise<Array<{
    id: string;
    chainId: number;
    chainName: string;
    symbol: string;
    name: string;
    address: string;
    decimals: number;
    logoUrl?: string;
    isActive: boolean;
    isNative: boolean;
    createdAt: string;
    updatedAt: string;
  }>> {
    return this.request<Array<{
      id: string;
      chainId: number;
      chainName: string;
      symbol: string;
      name: string;
      address: string;
      decimals: number;
      logoUrl?: string;
      isActive: boolean;
      isNative: boolean;
      createdAt: string;
      updatedAt: string;
    }>>('/api/tokens');
  }

  async getTokensByChain(chainId: number): Promise<Array<{
    id: string;
    chainId: number;
    chainName: string;
    symbol: string;
    name: string;
    address: string;
    decimals: number;
    logoUrl?: string;
    isActive: boolean;
    isNative: boolean;
    createdAt: string;
    updatedAt: string;
  }>> {
    return this.request<Array<{
      id: string;
      chainId: number;
      chainName: string;
      symbol: string;
      name: string;
      address: string;
      decimals: number;
      logoUrl?: string;
      isActive: boolean;
      isNative: boolean;
      createdAt: string;
      updatedAt: string;
    }>>(`/api/tokens/by-chain?chainId=${chainId}`);
  }

  async getSupportedChains(): Promise<Array<{
    chainId: number;
    chainName: string;
  }>> {
    return this.request<Array<{
      chainId: number;
      chainName: string;
    }>>('/api/tokens/chains');
  }
}

// Create default API client instance
export const apiClient = new SafePayrollApiClient({
  baseUrl: import.meta.env.PROD ? 'https://api.pactpay.app' : 'http://localhost:3000',
  timeout: 30000,
});

// All types are already exported above
