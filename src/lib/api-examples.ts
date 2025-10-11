// API Client Usage Examples
import { SafePayrollApiClient, apiClient } from './api-client';
import { PayrollType, PaymentFrequency } from '../types';

// Example 1: Basic Authentication Flow
export async function authenticationExample() {
  try {
    // 1. Get nonce for SIWE
    const { nonce, message } = await apiClient.getNonce('0x742d35Cc6634C0532925a3b844Bc454e4438f44e');
    
    // 2. User signs the message with their wallet
    // const signature = await wallet.signMessage(message);
    
    // 3. Login with signature
    const { accessToken, user } = await apiClient.login(
      '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
      'mock-signature',
      message
    );
    
    console.log('Login successful:', user);
    return { accessToken, user };
  } catch (error) {
    console.error('Authentication failed:', error);
    throw error;
  }
}

// Example 2: Organization Management
export async function organizationExample() {
  try {
    // Get user's organizations
    const { data: organizations } = await apiClient.getOrganizations();
    console.log('User organizations:', organizations);
    
    // Switch to a different organization
    if (organizations.length > 1) {
      const { accessToken, organization } = await apiClient.switchOrganization(organizations[1].id);
      console.log('Switched to organization:', organization);
    }
    
    // Get current organization details
    const currentOrg = await apiClient.getCurrentOrganization();
    console.log('Current organization:', currentOrg);
    
    return currentOrg;
  } catch (error) {
    console.error('Organization management failed:', error);
    throw error;
  }
}

// Example 3: Employee Management
export async function employeeExample() {
  try {
    // Get employees with pagination
    const { data: employees, pagination } = await apiClient.getEmployees({
      page: 1,
      limit: 20,
      isActive: true
    });
    console.log('Employees:', employees);
    console.log('Pagination:', pagination);
    
    // Create a new employee
    const newEmployee = await apiClient.createEmployee({
      name: 'John Doe',
      walletAddress: '0x1234567890123456789012345678901234567890',
      defaultSalary: '5000',
      defaultToken: '0xA0b86a33E6441b8C4C8C0C4C8C0C4C8C0C4C8C0C4',
      paymentFrequency: PaymentFrequency.MONTHLY
    });
    console.log('Created employee:', newEmployee);
    
    // Update employee
    const updatedEmployee = await apiClient.updateEmployee(newEmployee.id, {
      name: 'John Smith',
      defaultSalary: '6000'
    });
    console.log('Updated employee:', updatedEmployee);
    
    return { employees, newEmployee, updatedEmployee };
  } catch (error) {
    console.error('Employee management failed:', error);
    throw error;
  }
}

// Example 4: Payroll Management
export async function payrollExample() {
  try {
    // Get existing payrolls
    const { data: payrolls } = await apiClient.getPayrolls({
      page: 1,
      limit: 10
    });
    console.log('Existing payrolls:', payrolls);
    
    // Create a new payroll draft
    const draft = await apiClient.createPayrollDraft({
      safeWalletId: 'safe-wallet-id',
      title: 'October 2024 Payroll',
      type: PayrollType.MONTHLY,
      employeeIds: ['employee-1', 'employee-2']
    });
    console.log('Created payroll draft:', draft);
    
    // Update the draft with specific payment records
    const updatedDraft = await apiClient.updatePayrollDraft(draft.id, {
      paymentRecords: [
        {
          employeeId: 'employee-1',
          amount: '5000',
          tokenAddress: '0xA0b86a33E6441b8C4C8C0C4C8C0C4C8C0C4C8C0C4'
        },
        {
          employeeId: 'employee-2',
          amount: '6000',
          tokenAddress: '0xA0b86a33E6441b8C4C8C0C4C8C0C4C8C0C4C8C0C4'
        }
      ]
    });
    console.log('Updated payroll draft:', updatedDraft);
    
    // Propose the payroll to Safe
    const proposed = await apiClient.proposePayroll(updatedDraft.id);
    console.log('Proposed payroll:', proposed);
    
    return { payrolls, draft, updatedDraft, proposed };
  } catch (error) {
    console.error('Payroll management failed:', error);
    throw error;
  }
}

// Example 5: Transaction Management
export async function transactionExample() {
  try {
    // Get transactions
    const { data: transactions } = await apiClient.getTransactions({
      page: 1,
      limit: 20
    });
    console.log('Transactions:', transactions);
    
    // Get transaction details
    if (transactions.length > 0) {
      const transactionDetail = await apiClient.getTransactionDetail(transactions[0].id);
      console.log('Transaction detail:', transactionDetail);
      
      // Sync transaction status
      const syncResult = await apiClient.syncTransaction(transactions[0].id);
      console.log('Sync result:', syncResult);
    }
    
    return { transactions };
  } catch (error) {
    console.error('Transaction management failed:', error);
    throw error;
  }
}

// Example 6: Safe Wallet Operations
export async function safeWalletExample() {
  try {
    const safeAddress = '0x1234567890123456789012345678901234567890';
    const chainId = 1;
    
    // Get Safe info
    const safeInfo = await apiClient.getSafeInfo(safeAddress, chainId);
    console.log('Safe info:', safeInfo);
    
    // Get Safe balances
    const balances = await apiClient.getSafeBalances(safeAddress, chainId);
    console.log('Safe balances:', balances);
    
    // Verify if user is owner
    const verification = await apiClient.verifySafeOwner({
      safeAddress,
      chainId,
      userAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'
    });
    console.log('Owner verification:', verification);
    
    return { safeInfo, balances, verification };
  } catch (error) {
    console.error('Safe wallet operations failed:', error);
    throw error;
  }
}

// Example 7: Dashboard Overview
export async function dashboardExample() {
  try {
    const overview = await apiClient.getDashboardOverview();
    console.log('Dashboard overview:', overview);
    
    return overview;
  } catch (error) {
    console.error('Dashboard failed:', error);
    throw error;
  }
}

// Example 8: CSV Import/Export
export async function csvExample() {
  try {
    // Create a sample CSV file for import
    const csvContent = `name,walletAddress,defaultSalary,defaultToken,paymentFrequency
John Doe,0x1234567890123456789012345678901234567890,5000,0xA0b86a33E6441b8C4C8C0C4C8C0C4C8C0C4C8C0C4,MONTHLY
Jane Smith,0x0987654321098765432109876543210987654321,6000,0xA0b86a33E6441b8C4C8C0C4C8C0C4C8C0C4C8C0C4,MONTHLY`;
    
    const csvFile = new File([csvContent], 'employees.csv', { type: 'text/csv' });
    
    // Import employees from CSV
    const importResult = await apiClient.importEmployees(csvFile);
    console.log('Import result:', importResult);
    
    // Export employees to CSV
    const csvBlob = await apiClient.exportEmployees();
    console.log('Exported CSV blob:', csvBlob);
    
    return { importResult, csvBlob };
  } catch (error) {
    console.error('CSV operations failed:', error);
    throw error;
  }
}

// Example 9: Complete Workflow
export async function completeWorkflowExample() {
  try {
    console.log('Starting complete workflow example...');
    
    // 1. Authentication
    const { accessToken } = await authenticationExample();
    console.log('✅ Authentication completed');
    
    // 2. Organization setup
    const currentOrg = await organizationExample();
    console.log('✅ Organization setup completed');
    
    // 3. Employee management
    const { employees } = await employeeExample();
    console.log('✅ Employee management completed');
    
    // 4. Payroll creation
    const { draft } = await payrollExample();
    console.log('✅ Payroll creation completed');
    
    // 5. Transaction monitoring
    const { transactions } = await transactionExample();
    console.log('✅ Transaction monitoring completed');
    
    // 6. Safe wallet operations
    const { safeInfo, balances } = await safeWalletExample();
    console.log('✅ Safe wallet operations completed');
    
    // 7. Dashboard overview
    const overview = await dashboardExample();
    console.log('✅ Dashboard overview completed');
    
    console.log('🎉 Complete workflow example finished successfully!');
    
    return {
      accessToken,
      currentOrg,
      employees,
      draft,
      transactions,
      safeInfo,
      balances,
      overview
    };
  } catch (error) {
    console.error('❌ Complete workflow failed:', error);
    throw error;
  }
}

// Example 10: Error Handling
export async function errorHandlingExample() {
  try {
    // This will fail because we're not authenticated
    await apiClient.getCurrentUser();
  } catch (error) {
    console.log('Expected error caught:', error);
    
    // Handle different types of errors
    if (error instanceof Error) {
      if (error.message.includes('401')) {
        console.log('Authentication required');
        // Redirect to login
      } else if (error.message.includes('403')) {
        console.log('Insufficient permissions');
        // Show permission error
      } else if (error.message.includes('404')) {
        console.log('Resource not found');
        // Show not found error
      } else if (error.message.includes('timeout')) {
        console.log('Request timeout');
        // Show timeout error
      } else {
        console.log('Unknown error:', error.message);
        // Show generic error
      }
    }
  }
}

// Export all examples
export {
  authenticationExample,
  organizationExample,
  employeeExample,
  payrollExample,
  transactionExample,
  safeWalletExample,
  dashboardExample,
  csvExample,
  completeWorkflowExample,
  errorHandlingExample
};
