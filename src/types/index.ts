// Core Types for Safe Payroll System

export interface User {
  id: string;
  walletAddress: string;
  email?: string;
  lastOrganizationId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  createdAt: string;
}

export enum OrganizationRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export interface SafeWallet {
  id: string;
  organizationId: string;
  address: string;
  chainId: number;
  threshold: number;
  owners: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Legacy Employee interface - deprecated, use PaymentRecipient instead
// @deprecated Use PaymentRecipient instead
export interface Employee {
  id: string;
  organizationId: string;
  name: string;
  walletAddress: string;
  ensName?: string;
  defaultSalary: string;
  defaultToken: string;
  defaultTokenSymbol?: string;
  paymentFrequency: PaymentFrequency;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecipient {
  id: string;
  organizationId: string;
  name: string;
  walletAddress: string;
  ensDomain?: string;
  defaultAmount: string;
  tokenId: string;
  chainId: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Related data
  token?: {
    id: string;
    symbol: string;
    name: string;
    decimals: number;
    logoUrl?: string;
  };
  recentPayments?: Array<{
    id: string;
    amount: string;
    status: string;
    payrollId: string;
    payrollTitle: string;
    payrollStatus: string;
    createdAt: string;
  }>;
}

export enum PaymentFrequency {
  MONTHLY = 'MONTHLY',
  ONE_OFF = 'ONE_OFF',
}

export interface Payroll {
  id: string;
  organizationId: string;
  safeWalletId: string;
  title: string;
  type: PayrollType;
  status: PayrollStatus;
  totalAmount: Record<string, string>; // tokenAddress -> amount
  employeeCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export enum PayrollType {
  MONTHLY = 'MONTHLY',
  ONE_OFF = 'ONE_OFF',
}

export enum PayrollStatus {
  DRAFT = 'DRAFT',
  PROPOSED = 'PROPOSED',
  EXECUTED = 'EXECUTED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export interface PaymentRecord {
  id: string;
  payrollId: string;
  recipientId: string;
  recipientName: string;
  recipientAddress: string;
  amount: string;
  status: PaymentStatus;
  notes?: string;
  createdAt: string;
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface Transaction {
  id: string;
  payrollId?: string;
  safeWalletId: string;
  safeTxHash: string;
  ethereumTxHash?: string;
  status: TransactionStatus;
  confirmations: number;
  confirmationsRequired: number;
  nonce: number;
  data: any;
  createdAt: string;
  executedAt?: string;
  updatedAt: string;
}

export enum TransactionStatus {
  PROPOSED = 'PROPOSED',
  AWAITING_SIGNATURES = 'AWAITING_SIGNATURES',
  EXECUTABLE = 'EXECUTABLE',
  EXECUTED = 'EXECUTED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export interface TransactionSignature {
  id: string;
  transactionId: string;
  signerAddress: string;
  signature: string;
  signedAt: string;
}

export interface TokenBalance {
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  decimals: number;
  balance: string;
  fiatBalance?: string;
  fiatConversion?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  currentOrganizationId: string | null;
  accessToken: string | null;
}

export interface JWTPayload {
  userId: string;
  walletAddress: string;
  currentOrganizationId?: string;
  iat: number;
  exp: number;
}

// CSV Import Types
export interface EmployeeCSVRow {
  name: string;
  walletAddress: string;
  defaultSalary: string;
  defaultToken: string;
  paymentFrequency: string;
}

export interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    error: string;
  }>;
}
