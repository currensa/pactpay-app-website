// LocalStorage Data Management Layer
import {
  User,
  Organization,
  OrganizationMember,
  SafeWallet,
  Employee,
  Payroll,
  PaymentRecord,
  Transaction,
  TransactionSignature,
  AuthState,
} from '../types';

const STORAGE_KEYS = {
  AUTH: 'safe_payroll_auth',
  USERS: 'safe_payroll_users',
  ORGANIZATIONS: 'safe_payroll_organizations',
  ORGANIZATION_MEMBERS: 'safe_payroll_organization_members',
  SAFE_WALLETS: 'safe_payroll_safe_wallets',
  EMPLOYEES: 'safe_payroll_employees',
  PAYROLLS: 'safe_payroll_payrolls',
  PAYMENT_RECORDS: 'safe_payroll_payment_records',
  TRANSACTIONS: 'safe_payroll_transactions',
  TRANSACTION_SIGNATURES: 'safe_payroll_transaction_signatures',
};

// Generic storage functions
function get<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading from localStorage (${key}):`, error);
    return defaultValue;
  }
}

function set<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing to localStorage (${key}):`, error);
  }
}

// Auth Storage
export const authStorage = {
  get: (): AuthState => get(STORAGE_KEYS.AUTH, {
    isAuthenticated: false,
    user: null,
    currentOrganizationId: null,
    accessToken: null,
  }),
  set: (auth: AuthState) => set(STORAGE_KEYS.AUTH, auth),
  clear: () => localStorage.removeItem(STORAGE_KEYS.AUTH),
};

// User Storage
export const userStorage = {
  getAll: (): User[] => get(STORAGE_KEYS.USERS, []),
  getById: (id: string): User | undefined => {
    const users = userStorage.getAll();
    return users.find((u) => u.id === id);
  },
  getByWallet: (walletAddress: string): User | undefined => {
    const users = userStorage.getAll();
    return users.find((u) => u.walletAddress.toLowerCase() === walletAddress.toLowerCase());
  },
  create: (user: User): User => {
    const users = userStorage.getAll();
    users.push(user);
    set(STORAGE_KEYS.USERS, users);
    return user;
  },
  update: (id: string, updates: Partial<User>): User | undefined => {
    const users = userStorage.getAll();
    const index = users.findIndex((u) => u.id === id);
    if (index !== -1) {
      users[index] = { ...users[index], ...updates, updatedAt: new Date().toISOString() };
      set(STORAGE_KEYS.USERS, users);
      return users[index];
    }
    return undefined;
  },
};

// Organization Storage
export const organizationStorage = {
  getAll: (): Organization[] => get(STORAGE_KEYS.ORGANIZATIONS, []),
  getById: (id: string): Organization | undefined => {
    const orgs = organizationStorage.getAll();
    return orgs.find((o) => o.id === id);
  },
  create: (org: Organization): Organization => {
    const orgs = organizationStorage.getAll();
    orgs.push(org);
    set(STORAGE_KEYS.ORGANIZATIONS, orgs);
    return org;
  },
  update: (id: string, updates: Partial<Organization>): Organization | undefined => {
    const orgs = organizationStorage.getAll();
    const index = orgs.findIndex((o) => o.id === id);
    if (index !== -1) {
      orgs[index] = { ...orgs[index], ...updates, updatedAt: new Date().toISOString() };
      set(STORAGE_KEYS.ORGANIZATIONS, orgs);
      return orgs[index];
    }
    return undefined;
  },
};

// Organization Members Storage
export const organizationMemberStorage = {
  getAll: (): OrganizationMember[] => get(STORAGE_KEYS.ORGANIZATION_MEMBERS, []),
  getByOrganization: (organizationId: string): OrganizationMember[] => {
    const members = organizationMemberStorage.getAll();
    return members.filter((m) => m.organizationId === organizationId);
  },
  getByUser: (userId: string): OrganizationMember[] => {
    const members = organizationMemberStorage.getAll();
    return members.filter((m) => m.userId === userId);
  },
  create: (member: OrganizationMember): OrganizationMember => {
    const members = organizationMemberStorage.getAll();
    members.push(member);
    set(STORAGE_KEYS.ORGANIZATION_MEMBERS, members);
    return member;
  },
};

// Safe Wallet Storage
export const safeWalletStorage = {
  getAll: (): SafeWallet[] => get(STORAGE_KEYS.SAFE_WALLETS, []),
  getById: (id: string): SafeWallet | undefined => {
    const wallets = safeWalletStorage.getAll();
    return wallets.find((w) => w.id === id);
  },
  getByOrganization: (organizationId: string): SafeWallet[] => {
    const wallets = safeWalletStorage.getAll();
    return wallets.filter((w) => w.organizationId === organizationId);
  },
  getActiveByOrganization: (organizationId: string): SafeWallet | undefined => {
    const wallets = safeWalletStorage.getByOrganization(organizationId);
    return wallets.find((w) => w.isActive);
  },
  create: (wallet: SafeWallet): SafeWallet => {
    const wallets = safeWalletStorage.getAll();
    wallets.push(wallet);
    set(STORAGE_KEYS.SAFE_WALLETS, wallets);
    return wallet;
  },
  update: (id: string, updates: Partial<SafeWallet>): SafeWallet | undefined => {
    const wallets = safeWalletStorage.getAll();
    const index = wallets.findIndex((w) => w.id === id);
    if (index !== -1) {
      wallets[index] = { ...wallets[index], ...updates, updatedAt: new Date().toISOString() };
      set(STORAGE_KEYS.SAFE_WALLETS, wallets);
      return wallets[index];
    }
    return undefined;
  },
};

// Employee Storage
export const employeeStorage = {
  getAll: (): Employee[] => get(STORAGE_KEYS.EMPLOYEES, []),
  getById: (id: string): Employee | undefined => {
    const employees = employeeStorage.getAll();
    return employees.find((e) => e.id === id);
  },
  getByOrganization: (organizationId: string): Employee[] => {
    const employees = employeeStorage.getAll();
    return employees.filter((e) => e.organizationId === organizationId && e.isActive);
  },
  create: (employee: Employee): Employee => {
    const employees = employeeStorage.getAll();
    employees.push(employee);
    set(STORAGE_KEYS.EMPLOYEES, employees);
    return employee;
  },
  update: (id: string, updates: Partial<Employee>): Employee | undefined => {
    const employees = employeeStorage.getAll();
    const index = employees.findIndex((e) => e.id === id);
    if (index !== -1) {
      employees[index] = { ...employees[index], ...updates, updatedAt: new Date().toISOString() };
      set(STORAGE_KEYS.EMPLOYEES, employees);
      return employees[index];
    }
    return undefined;
  },
  delete: (id: string): boolean => {
    const employees = employeeStorage.getAll();
    const filtered = employees.filter((e) => e.id !== id);
    if (filtered.length !== employees.length) {
      set(STORAGE_KEYS.EMPLOYEES, filtered);
      return true;
    }
    return false;
  },
};

// Payroll Storage
export const payrollStorage = {
  getAll: (): Payroll[] => get(STORAGE_KEYS.PAYROLLS, []),
  getById: (id: string): Payroll | undefined => {
    const payrolls = payrollStorage.getAll();
    return payrolls.find((p) => p.id === id);
  },
  getByOrganization: (organizationId: string): Payroll[] => {
    const payrolls = payrollStorage.getAll();
    return payrolls.filter((p) => p.organizationId === organizationId);
  },
  create: (payroll: Payroll): Payroll => {
    const payrolls = payrollStorage.getAll();
    payrolls.push(payroll);
    set(STORAGE_KEYS.PAYROLLS, payrolls);
    return payroll;
  },
  update: (id: string, updates: Partial<Payroll>): Payroll | undefined => {
    const payrolls = payrollStorage.getAll();
    const index = payrolls.findIndex((p) => p.id === id);
    if (index !== -1) {
      payrolls[index] = { ...payrolls[index], ...updates, updatedAt: new Date().toISOString() };
      set(STORAGE_KEYS.PAYROLLS, payrolls);
      return payrolls[index];
    }
    return undefined;
  },
};

// Payment Record Storage
export const paymentRecordStorage = {
  getAll: (): PaymentRecord[] => get(STORAGE_KEYS.PAYMENT_RECORDS, []),
  getByPayroll: (payrollId: string): PaymentRecord[] => {
    const records = paymentRecordStorage.getAll();
    return records.filter((r) => r.payrollId === payrollId);
  },
  getByEmployee: (employeeId: string): PaymentRecord[] => {
    const records = paymentRecordStorage.getAll();
    return records.filter((r) => r.employeeId === employeeId);
  },
  create: (record: PaymentRecord): PaymentRecord => {
    const records = paymentRecordStorage.getAll();
    records.push(record);
    set(STORAGE_KEYS.PAYMENT_RECORDS, records);
    return record;
  },
  createBatch: (records: PaymentRecord[]): PaymentRecord[] => {
    const allRecords = paymentRecordStorage.getAll();
    allRecords.push(...records);
    set(STORAGE_KEYS.PAYMENT_RECORDS, allRecords);
    return records;
  },
  update: (id: string, updates: Partial<PaymentRecord>): PaymentRecord | undefined => {
    const records = paymentRecordStorage.getAll();
    const index = records.findIndex((r) => r.id === id);
    if (index !== -1) {
      records[index] = { ...records[index], ...updates };
      set(STORAGE_KEYS.PAYMENT_RECORDS, records);
      return records[index];
    }
    return undefined;
  },
};

// Transaction Storage
export const transactionStorage = {
  getAll: (): Transaction[] => get(STORAGE_KEYS.TRANSACTIONS, []),
  getById: (id: string): Transaction | undefined => {
    const txs = transactionStorage.getAll();
    return txs.find((t) => t.id === id);
  },
  getBySafeWallet: (safeWalletId: string): Transaction[] => {
    const txs = transactionStorage.getAll();
    return txs.filter((t) => t.safeWalletId === safeWalletId);
  },
  getByPayroll: (payrollId: string): Transaction | undefined => {
    const txs = transactionStorage.getAll();
    return txs.find((t) => t.payrollId === payrollId);
  },
  create: (tx: Transaction): Transaction => {
    const txs = transactionStorage.getAll();
    txs.push(tx);
    set(STORAGE_KEYS.TRANSACTIONS, txs);
    return tx;
  },
  update: (id: string, updates: Partial<Transaction>): Transaction | undefined => {
    const txs = transactionStorage.getAll();
    const index = txs.findIndex((t) => t.id === id);
    if (index !== -1) {
      txs[index] = { ...txs[index], ...updates, updatedAt: new Date().toISOString() };
      set(STORAGE_KEYS.TRANSACTIONS, txs);
      return txs[index];
    }
    return undefined;
  },
};

// Transaction Signature Storage
export const transactionSignatureStorage = {
  getAll: (): TransactionSignature[] => get(STORAGE_KEYS.TRANSACTION_SIGNATURES, []),
  getByTransaction: (transactionId: string): TransactionSignature[] => {
    const sigs = transactionSignatureStorage.getAll();
    return sigs.filter((s) => s.transactionId === transactionId);
  },
  create: (signature: TransactionSignature): TransactionSignature => {
    const sigs = transactionSignatureStorage.getAll();
    sigs.push(signature);
    set(STORAGE_KEYS.TRANSACTION_SIGNATURES, sigs);
    return signature;
  },
};

// Clear all data
export function clearAllData(): void {
  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
}
