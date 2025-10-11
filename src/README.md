# Safe Payroll - Decentralized Payroll Management

A complete frontend application for managing payroll using Safe (Gnosis Safe) multi-signature wallets.

## 🎯 Features

### ✅ Implemented
- **Web3 Authentication**: Wallet connection with simplified SIWE-style signing
- **Multi-Organization Support**: Users can manage multiple organizations
- **Employee Management**: Full CRUD operations with CSV import/export
- **Payroll Creation**: Step-by-step wizard for creating payroll runs
- **Safe Integration**: Read Safe wallet information (owners, threshold, balances)
- **Transaction Proposals**: Generate Safe transaction URLs for signing
- **Dashboard**: Overview of organization statistics and activity
- **LocalStorage Persistence**: All data stored locally in browser

### 🔄 Demo Mode Features
Since this is a frontend-only implementation with localStorage, certain features run in demo mode:

- **Transaction Proposals**: Generate mock transaction hashes and Safe App URLs
- **Transaction Status**: Returns simulated status for demonstration
- **Balances**: Shows ETH balance only (full ERC20 token support requires backend)

## 🚀 Getting Started

### Prerequisites
- MetaMask or another Web3 wallet browser extension
- A Safe wallet on Sepolia testnet (recommended for testing)

### Quick Start

1. **Connect Your Wallet**
   - Click "Connect Wallet to Continue" on the login page
   - Approve the connection in your wallet
   - Sign the login message

2. **Create Your Organization**
   - Enter your organization name and email
   - Select the network (Sepolia recommended)
   - Enter your Safe wallet address
   - Click "Verify" to confirm you're an owner
   - Create the organization

3. **Add Employees**
   - Navigate to "Employees" in the sidebar
   - Click "Add Employee"
   - Enter employee details (name, wallet address, default salary)
   - Or import multiple employees via CSV

4. **Create a Payroll Run**
   - Click "Create Payroll" from the dashboard
   - Enter a payroll title
   - Select employees and adjust amounts
   - Review and propose to Safe
   - Click the Safe App link to sign the transaction

## 📁 Project Structure

```
├── /lib                      # Core libraries
│   ├── auth.ts              # Authentication logic
│   ├── safe.ts              # Safe wallet integration
│   ├── storage.ts           # LocalStorage management
│   └── utils.ts             # Utility functions
├── /contexts
│   └── AuthContext.tsx      # Authentication context
├── /pages                    # Page components
│   ├── LoginPage.tsx
│   ├── OnboardingPage.tsx
│   ├── DashboardPage.tsx
│   ├── EmployeesPage.tsx
│   ├── PayrollsPage.tsx
│   ├── CreatePayrollPage.tsx
│   └── PayrollDetailPage.tsx
├── /components
│   ├── Layout.tsx           # Main layout with sidebar
│   └── /ui                  # ShadCN UI components
└── /types
    └── index.ts             # TypeScript type definitions
```

## 🔐 Security Notes

This is a **non-custodial** application:
- Your private keys never leave your wallet
- All transactions require signing in your wallet
- Funds remain in your Safe wallet at all times
- The application only reads Safe information and generates transaction proposals

## 🛠️ Technical Details

### Technologies
- **React** with TypeScript
- **Tailwind CSS** v4
- **ethers.js** for blockchain interaction
- **React Router** for navigation
- **ShadCN UI** components
- **LocalStorage** for data persistence

### Supported Networks
- Ethereum Mainnet (chainId: 1)
- Goerli Testnet (chainId: 5)
- Sepolia Testnet (chainId: 11155111) ⭐ Recommended
- Polygon (chainId: 137)

### Data Storage
All data is stored in browser localStorage under these keys:
- `safe_payroll_auth` - Authentication state
- `safe_payroll_users` - User records
- `safe_payroll_organizations` - Organizations
- `safe_payroll_organization_members` - Organization memberships
- `safe_payroll_safe_wallets` - Safe wallet configurations
- `safe_payroll_employees` - Employee roster
- `safe_payroll_payrolls` - Payroll runs
- `safe_payroll_payment_records` - Payment details
- `safe_payroll_transactions` - Transaction records

## 🔮 Future Enhancements

To make this production-ready, consider:

1. **Backend Integration**
   - Replace localStorage with Supabase or NestJS API
   - Implement proper SIWE verification
   - Add webhook listeners for transaction status updates

2. **Full Safe SDK Integration**
   - Use complete Safe{Core} SDK for real transaction proposals
   - Implement proper signature collection
   - Support ERC20 token transfers with ABI encoding

3. **Enhanced Features**
   - Multi-token support with real-time prices
   - Transaction history with blockchain explorer links
   - Email notifications for pending signatures
   - Recurring payroll schedules
   - Employee self-service portal

4. **Security Improvements**
   - Rate limiting
   - PII encryption
   - Audit logging
   - Role-based access control (RBAC)

## 📝 CSV Import Format

For batch employee import, use this CSV format:

```csv
Name,Wallet Address,Default Salary,Token Symbol,Payment Frequency
John Doe,0x1234...,5000,USDC,MONTHLY
Jane Smith,vitalik.eth,6000,USDC,MONTHLY
```

## 🤝 Contributing

This is a demo application. For production use, please implement proper backend infrastructure and security measures.

## ⚠️ Disclaimer

This application is for demonstration purposes. Do not use for managing real payroll or sensitive financial data without implementing proper security measures, backend infrastructure, and thorough testing.

## 📄 License

MIT License - See LICENSE file for details

---

Built with ❤️ using Safe{Core} SDK and modern Web3 technologies
