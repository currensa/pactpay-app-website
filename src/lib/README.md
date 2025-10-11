# Safe Payroll API Client

这是一个为 Safe Payroll 系统设计的 TypeScript API 客户端，提供了完整的后端接口封装和 React Hooks 支持。

## 特性

- 🚀 **完整的 API 覆盖**: 支持所有后端接口
- 🎣 **React Hooks**: 简化状态管理和数据获取
- 🔒 **类型安全**: 完整的 TypeScript 类型定义
- 🔄 **自动重试**: 内置错误处理和重试机制
- 📱 **响应式**: 支持分页、搜索、过滤
- 🎯 **组织切换**: 自动处理多组织上下文

## 快速开始

### 1. 基础使用

```typescript
import { apiClient } from './lib/api-client';

// 设置认证令牌
apiClient.setAccessToken('your-jwt-token');

// 获取员工列表
const employees = await apiClient.getEmployees({ page: 1, limit: 20 });

// 创建新员工
const newEmployee = await apiClient.createEmployee({
  name: 'John Doe',
  walletAddress: '0x1234...',
  defaultSalary: '5000',
  defaultToken: '0xA0b8...',
  paymentFrequency: 'MONTHLY'
});
```

### 2. 使用 React Hooks

```typescript
import { useEmployees, useCreateEmployee } from './hooks/useApiClient';

function EmployeeList() {
  const { data: employees, loading, error, refetch } = useEmployees({
    page: 1,
    limit: 20,
    isActive: true
  });

  const { createEmployee, loading: createLoading } = useCreateEmployee();

  const handleCreate = async (employeeData) => {
    try {
      await createEmployee(employeeData);
      refetch(); // 刷新列表
    } catch (error) {
      console.error('Failed to create employee:', error);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {employees?.data.map(employee => (
        <div key={employee.id}>{employee.name}</div>
      ))}
    </div>
  );
}
```

## API 客户端方法

### 认证相关

```typescript
// 获取登录 nonce
const { nonce, message } = await apiClient.getNonce(walletAddress);

// 登录
const { accessToken, user } = await apiClient.login(
  walletAddress, 
  signature, 
  message
);

// 获取当前用户信息
const userInfo = await apiClient.getCurrentUser();
```

### 组织管理

```typescript
// 获取用户组织列表
const { data: organizations } = await apiClient.getOrganizations();

// 切换组织
const { accessToken, organization } = await apiClient.switchOrganization(orgId);

// 获取当前组织详情
const currentOrg = await apiClient.getCurrentOrganization();

// 添加 Safe 钱包
const safeWallet = await apiClient.addSafeWallet({
  address: '0x1234...',
  chainId: 1
});
```

### 员工管理

```typescript
// 获取员工列表（支持分页和搜索）
const { data: employees, pagination } = await apiClient.getEmployees({
  page: 1,
  limit: 20,
  search: 'John',
  isActive: true
});

// 创建员工
const employee = await apiClient.createEmployee({
  name: 'John Doe',
  walletAddress: '0x1234...',
  defaultSalary: '5000',
  defaultToken: '0xA0b8...',
  paymentFrequency: 'MONTHLY'
});

// 更新员工
const updated = await apiClient.updateEmployee(employeeId, {
  name: 'John Smith',
  defaultSalary: '6000'
});

// 删除员工
await apiClient.deleteEmployee(employeeId);

// CSV 导入
const result = await apiClient.importEmployees(csvFile);

// CSV 导出
const csvBlob = await apiClient.exportEmployees();
```

### 薪资单管理

```typescript
// 获取薪资单列表
const { data: payrolls } = await apiClient.getPayrolls({
  page: 1,
  status: 'DRAFT',
  type: 'MONTHLY'
});

// 创建薪资单草稿
const draft = await apiClient.createPayrollDraft({
  safeWalletId: 'safe-wallet-id',
  title: 'October 2024 Payroll',
  type: 'MONTHLY',
  employeeIds: ['emp1', 'emp2']
});

// 更新草稿
const updated = await apiClient.updatePayrollDraft(payrollId, {
  paymentRecords: [
    {
      employeeId: 'emp1',
      amount: '5000',
      tokenAddress: '0xA0b8...'
    }
  ]
});

// 提交到 Safe
const proposed = await apiClient.proposePayroll(payrollId);

// 获取薪资单详情
const detail = await apiClient.getPayrollDetail(payrollId);
```

### 交易管理

```typescript
// 获取交易列表
const { data: transactions } = await apiClient.getTransactions({
  safeWalletId: 'safe-wallet-id',
  page: 1,
  limit: 20
});

// 获取交易详情
const detail = await apiClient.getTransactionDetail(transactionId);

// 同步交易状态
const syncResult = await apiClient.syncTransaction(transactionId);
```

### Safe 钱包操作

```typescript
// 获取 Safe 信息
const safeInfo = await apiClient.getSafeInfo(address, chainId);

// 获取余额
const balances = await apiClient.getSafeBalances(address, chainId);

// 验证所有者
const verification = await apiClient.verifySafeOwner({
  safeAddress: '0x1234...',
  chainId: 1,
  userAddress: '0x5678...'
});
```

### 仪表板

```typescript
// 获取仪表板概览
const overview = await apiClient.getDashboardOverview();
```

## React Hooks

### 认证 Hooks

```typescript
import { useAuth } from './hooks/useApiClient';

function LoginComponent() {
  const { isAuthenticated, user, login, logout } = useAuth();

  const handleLogin = async () => {
    await login(walletAddress, signature, message);
  };

  return (
    <div>
      {isAuthenticated ? (
        <div>
          <p>Welcome, {user?.walletAddress}</p>
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <button onClick={handleLogin}>Login</button>
      )}
    </div>
  );
}
```

### 数据获取 Hooks

```typescript
import { 
  useEmployees, 
  usePayrolls, 
  useTransactions,
  useDashboard 
} from './hooks/useApiClient';

function DataComponent() {
  const { data: employees, loading, error, refetch } = useEmployees();
  const { data: payrolls } = usePayrolls({ status: 'DRAFT' });
  const { data: transactions } = useTransactions();
  const { data: dashboard } = useDashboard();

  // 组件会自动处理加载状态和错误
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Employees: {employees?.data.length}</h2>
      <h2>Payrolls: {payrolls?.data.length}</h2>
      <h2>Transactions: {transactions?.data.length}</h2>
    </div>
  );
}
```

### 操作 Hooks

```typescript
import { 
  useCreateEmployee, 
  useUpdateEmployee, 
  useDeleteEmployee,
  useProposePayroll 
} from './hooks/useApiClient';

function EmployeeActions() {
  const { createEmployee, loading: createLoading } = useCreateEmployee();
  const { updateEmployee, loading: updateLoading } = useUpdateEmployee();
  const { deleteEmployee, loading: deleteLoading } = useDeleteEmployee();

  const handleCreate = async (data) => {
    try {
      await createEmployee(data);
      // 成功处理
    } catch (error) {
      // 错误处理
    }
  };

  return (
    <div>
      <button 
        onClick={() => handleCreate(employeeData)}
        disabled={createLoading}
      >
        {createLoading ? 'Creating...' : 'Create Employee'}
      </button>
    </div>
  );
}
```

## 错误处理

```typescript
import { useApiError } from './hooks/useApiClient';

function ErrorHandlingComponent() {
  const { error, clearError, handleError } = useApiError();

  const handleApiCall = async () => {
    try {
      await apiClient.someMethod();
    } catch (err) {
      handleError(err); // 自动设置错误状态
    }
  };

  return (
    <div>
      {error && (
        <div className="error">
          <p>{error}</p>
          <button onClick={clearError}>Clear Error</button>
        </div>
      )}
    </div>
  );
}
```

## 配置

### 环境变量

```env
# API 基础 URL
REACT_APP_API_BASE_URL=http://localhost:3000

# 生产环境
REACT_APP_API_BASE_URL=https://api.safepayroll.com
```

### 自定义配置

```typescript
import { SafePayrollApiClient } from './lib/api-client';

const customApiClient = new SafePayrollApiClient({
  baseUrl: 'https://custom-api.com',
  timeout: 60000
});

// 使用自定义客户端
customApiClient.setAccessToken('token');
```

## 类型定义

所有 API 响应都有完整的 TypeScript 类型定义：

```typescript
import type {
  User,
  Organization,
  Employee,
  Payroll,
  Transaction,
  SafeWallet,
  TokenBalance,
  PaymentRecord,
  // ... 更多类型
} from './types';

import type {
  ApiResponse,
  PaginatedResponse,
  AuthResponse,
  DashboardOverview,
  // ... 更多 API 类型
} from './lib/api-client';
```

## 最佳实践

### 1. 使用 Hooks 进行状态管理

```typescript
// ✅ 推荐：使用 Hooks
const { data, loading, error } = useEmployees();

// ❌ 不推荐：直接调用 API
const [employees, setEmployees] = useState([]);
useEffect(() => {
  apiClient.getEmployees().then(setEmployees);
}, []);
```

### 2. 错误处理

```typescript
// ✅ 推荐：使用 try-catch
try {
  await createEmployee(data);
  toast.success('Employee created!');
} catch (error) {
  toast.error('Failed to create employee');
}

// ❌ 不推荐：忽略错误
createEmployee(data); // 可能失败但不处理
```

### 3. 加载状态

```typescript
// ✅ 推荐：显示加载状态
if (loading) return <Spinner />;

// ❌ 不推荐：不显示加载状态
return <div>{data?.map(...)}</div>; // 可能显示空白
```

### 4. 数据刷新

```typescript
// ✅ 推荐：操作后刷新数据
const { refetch } = useEmployees();

const handleCreate = async (data) => {
  await createEmployee(data);
  refetch(); // 刷新列表
};
```

## 示例项目

查看 `src/examples/ApiClientUsage.tsx` 文件，了解完整的使用示例。

## 故障排除

### 常见问题

1. **认证失败**: 确保设置了正确的 access token
2. **网络错误**: 检查 API 基础 URL 配置
3. **类型错误**: 确保导入了正确的类型定义
4. **组织切换**: 使用 `switchOrganization` 后会自动更新 token

### 调试

```typescript
// 启用调试日志
console.log('Current token:', apiClient.getAccessToken());
console.log('API base URL:', apiClient.baseUrl);
```

## 贡献

欢迎提交 Issue 和 Pull Request 来改进这个 API 客户端！
