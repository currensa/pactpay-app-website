# Safe Payroll 系统设计文档

## 1. 系统概述

Safe Payroll 是一个基于 Safe 多签钱包的薪资管理系统，面向项目负责人（CEO、财务经理）提供安全、便捷的薪资发放管理功能。系统严格遵循非托管原则，所有与 Safe 钱包的交互都通过 Safe{Core} SDK 完成。

### 1.1 核心特性

- Web3 钱包认证（SIWE 标准）
- Safe 多签钱包集成
- 员工名册管理
- 薪资单创建与管理
- 批量交易提案与状态监控
- 实时余额查询与警告

### 1.2 技术栈

- **后端框架**: NestJS
- **数据库**: PostgreSQL + Prisma ORM
- **区块链集成**: Safe{Core} SDK + RainbowKit
- **认证**: JWT + SIWE (Sign-In with Ethereum)
- **文档**: Swagger/OpenAPI

### 1.3 多组织架构设计

#### 核心概念

- **用户（User）**: 通过钱包地址唯一标识的账户
- **组织（Organization）**: 独立的薪资管理单元，对应一个或多个 Safe 钱包
- **当前组织（Current Organization）**: 用户当前操作的组织上下文，存储在 JWT 中

#### 设计原则

1. **一个用户可以属于多个组织**
   - 财务人员可能同时管理多家公司
   - 顾问可能为多个客户提供服务

2. **完全的数据隔离**
   - 每个组织的员工、薪资单、交易数据完全独立
   - 用户只能访问其所属组织的数据

3. **当前组织上下文 - 两阶段Token机制**
   - **第一阶段**：登录后获得无组织上下文的Token
   - **第二阶段**：选择组织后获得带组织上下文的Token
   - 当前组织 ID 存储在 JWT Token 中
   - 切换组织时重新签发 Token
   - 所有 API 请求自动使用当前组织，无需前端传递 organizationId

4. **组织选择流程**
   ```
   用户钱包登录
     ↓
   获得初始Token（无currentOrganizationId）
     ↓
   查询可用组织 (GET /companies/available)
     ↓
   根据组织数量自动处理：
     - 0个 → 引导创建
     - 1个 → 自动选择
     - 多个 → 显示选择界面
     ↓
   选择组织 (POST /session/select-company)
     ↓
   获得新Token（包含currentOrganizationId）
     ↓
   后续所有请求自动使用该组织
   ```

#### 优势

- ✅ **前端调用简洁**: 不需要每个请求传 organizationId
- ✅ **安全性高**: 组织 ID 在服务端验证，不易篡改
- ✅ **易于维护**: 后端统一从 JWT 获取组织上下文
- ✅ **用户体验好**: 明确的"当前组织"概念，减少误操作

---

## 2. 模块设计

### 2.1 核心模块架构

```
src/
├── modules/
│   ├── auth/                 # 认证模块
│   ├── user/                 # 用户模块
│   ├── organization/         # 组织模块
│   ├── employee/             # 员工模块
│   ├── payroll/              # 薪资单模块
│   ├── transaction/          # 交易模块
│   ├── safe/                 # Safe 钱包集成模块
│   └── dashboard/            # 仪表板模块
├── common/                   # 共享模块
│   ├── decorators/           # 自定义装饰器
│   ├── filters/              # 异常过滤器
│   ├── guards/               # 守卫
│   ├── interceptors/         # 拦截器
│   ├── pipes/                # 管道
│   └── dto/                  # 通用 DTO
├── config/                   # 配置
└── database/                 # 数据库
    ├── migrations/           # 迁移文件
    └── seeds/                # 种子数据
```

### 2.2 模块职责说明

#### 2.2.1 Auth Module（认证模块）

- **职责**:
  - Web3 钱包连接与认证（SIWE）
  - 两阶段JWT Token 生成与验证
  - Session和组织选择管理
- **依赖**: User Module, Organization Module
- **主要服务**:
  - `AuthService`: 认证逻辑
  - `SiweService`: SIWE 签名验证
  - `SessionService`: 组织选择和切换
  - `JwtStrategy`: JWT 策略

#### 2.2.2 User Module（用户模块）

- **职责**:
  - 用户信息管理
  - 钱包地址与用户关联
  - 用户角色与权限管理
- **主要服务**:
  - `UserService`: 用户 CRUD 操作
  - `UserRepository`: 数据访问层

#### 2.2.3 Organization Module（组织模块）

- **职责**:
  - 组织创建与管理
  - Safe 钱包关联与验证
  - 管理员权限管理
- **依赖**: Safe Module, User Module
- **主要服务**:
  - `OrganizationService`: 组织业务逻辑
  - `OrganizationRepository`: 数据访问层

#### 2.2.4 Employee Module（员工模块）

- **职责**:
  - 员工名册 CRUD 操作
  - CSV 批量导入/导出
  - 员工历史支付记录查询
- **依赖**: Organization Module
- **主要服务**:
  - `EmployeeService`: 员工业务逻辑
  - `EmployeeCsvService`: CSV 处理
  - `EmployeeRepository`: 数据访问层

#### 2.2.5 Payroll Module（薪资单模块）

- **职责**:
  - 薪资单创建（按月/单次）
  - 薪资单草稿管理
  - 薪资单历史记录
  - 支付明细管理
- **依赖**: Employee Module, Transaction Module, Safe Module
- **主要服务**:
  - `PayrollService`: 薪资单业务逻辑
  - `PayrollDraftService`: 草稿管理
  - `PayrollRepository`: 数据访问层

#### 2.2.6 Transaction Module（交易模块）

- **职责**:
  - Safe 交易提案创建
  - 交易状态监控与同步
  - 签名状态追踪
  - 交易执行状态更新
- **依赖**: Safe Module, Payroll Module
- **主要服务**:
  - `TransactionService`: 交易业务逻辑
  - `TransactionSyncService`: 状态同步（定时任务）
  - `TransactionRepository`: 数据访问层

#### 2.2.7 Safe Module（Safe 钱包集成模块）

- **职责**:
  - Safe{Core} SDK 封装
  - Safe 钱包信息查询
  - 所有者验证
  - 余额查询（多代币）
  - 批量交易构建
- **主要服务**:
  - `SafeService`: Safe SDK 核心服务
  - `SafeApiService`: Safe API Kit 封装
  - `SafeProtocolService`: Safe Protocol Kit 封装

#### 2.2.8 Dashboard Module（仪表板模块）

- **职责**:
  - 概览数据聚合
  - 待处理任务统计
  - 近期活动查询
- **依赖**: Organization Module, Payroll Module, Transaction Module, Safe Module
- **主要服务**:
  - `DashboardService`: 仪表板数据聚合

---

## 3. 数据模型设计

### 3.1 核心实体关系

```
User (用户)
  ├── 1:N → Organization (通过 OrganizationMember)
  └── 1:1 → walletAddress

Organization (组织)
  ├── 1:N → OrganizationMember
  ├── 1:N → SafeWallet
  ├── 1:N → Employee
  └── 1:N → Payroll

SafeWallet (Safe 钱包)
  ├── N:1 → Organization
  └── 1:N → Transaction

Employee (员工)
  ├── N:1 → Organization
  └── 1:N → PaymentRecord

Payroll (薪资单)
  ├── N:1 → Organization
  ├── 1:N → PaymentRecord
  └── 1:1 → Transaction

Transaction (交易)
  ├── N:1 → SafeWallet
  └── 1:N → TransactionSignature

PaymentRecord (支付记录)
  ├── N:1 → Payroll
  └── N:1 → Employee
```

### 3.2 实体字段设计

#### User（用户表）

```typescript
{
  id: string (UUID)
  walletAddress: string (唯一，以太坊地址)
  email?: string
  lastOrganizationId?: string (最后使用的组织 ID，用于登录时默认选择)
  createdAt: DateTime
  updatedAt: DateTime
}
```

#### Organization（组织表）

```typescript
{
  id: string(UUID);
  name: string;
  email: string;
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

#### OrganizationMember（组织成员表）

```typescript
{
  id: string (UUID)
  organizationId: string (FK)
  userId: string (FK)
  role: enum ('ADMIN' | 'MEMBER')
  createdAt: DateTime
}
```

#### SafeWallet（Safe 钱包表）

```typescript
{
  id: string (UUID)
  organizationId: string (FK)
  address: string (Safe 钱包地址)
  chainId: number (链 ID)
  threshold: number (签名阈值)
  owners: string[] (所有者地址列表)
  isActive: boolean (是否激活)
  createdAt: DateTime
  updatedAt: DateTime
}
```

#### Employee（员工表）

```typescript
{
  id: string (UUID)
  organizationId: string (FK)
  name: string
  walletAddress: string (员工钱包地址或 ENS)
  ensName?: string (ENS 域名)
  defaultSalary: string (默认薪资，BigNumber 字符串)
  defaultToken: string (默认代币地址)
  paymentFrequency: enum ('MONTHLY' | 'ONE_OFF')
  isActive: boolean
  createdAt: DateTime
  updatedAt: DateTime
}
```

#### Payroll（薪资单表）

```typescript
{
  id: string (UUID)
  organizationId: string (FK)
  safeWalletId: string (FK)
  title: string (薪资单标题)
  type: enum ('MONTHLY' | 'ONE_OFF')
  status: enum ('DRAFT' | 'PROPOSED' | 'EXECUTED' | 'FAILED' | 'CANCELLED')
  totalAmount: object (按代币统计的总金额)
  employeeCount: number
  createdBy: string (创建人 User ID)
  createdAt: DateTime
  updatedAt: DateTime
}
```

#### PaymentRecord（支付记录表）

```typescript
{
  id: string (UUID)
  payrollId: string (FK)
  employeeId: string (FK)
  recipientAddress: string (收款地址)
  amount: string (金额，BigNumber 字符串)
  tokenAddress: string (代币合约地址)
  tokenSymbol: string (代币符号)
  status: enum ('PENDING' | 'COMPLETED' | 'FAILED')
  createdAt: DateTime
}
```

#### Transaction（交易表）

```typescript
{
  id: string (UUID)
  payrollId: string (FK, 可选)
  safeWalletId: string (FK)
  safeTxHash: string (Safe 交易哈希)
  ethereumTxHash?: string (以太坊交易哈希)
  status: enum ('PROPOSED' | 'AWAITING_SIGNATURES' | 'EXECUTABLE' | 'EXECUTED' | 'FAILED' | 'CANCELLED')
  confirmations: number (当前签名数)
  confirmationsRequired: number (需要签名数)
  nonce: number
  data: object (交易原始数据)
  createdAt: DateTime
  executedAt?: DateTime
  updatedAt: DateTime
}
```

#### TransactionSignature（交易签名表）

```typescript
{
  id: string(UUID);
  transactionId: string(FK);
  signerAddress: string(签名者地址);
  signature: string;
  signedAt: DateTime;
}
```

---

## 4. API 设计

### 4.1 API 路由结构

所有 API 前缀：`/api/enterprise`（企业门户）

```
/api/enterprise
├── /auth                     # 认证相关
│   ├── GET /nonce            # 获取登录 nonce
│   ├── POST /login           # 登录
│   └── GET /me               # 获取当前用户信息（含当前组织）
├── /organizations            # 组织列表与切换
│   ├── GET /                 # 获取用户所属组织列表（用于切换）
│   ├── POST /                # 创建组织
│   ├── POST /:id/switch      # 切换当前组织（重要）
│   └── GET /:id              # 查看指定组织信息（只读，需要是成员）
├── /organization             # 当前组织管理（单数，表示当前）
│   ├── GET /                 # 获取当前组织详情
│   ├── POST /safe-wallets    # 给当前组织添加 Safe 钱包
│   └── POST /admins          # 给当前组织添加管理员
├── /employees                # 员工管理（自动使用当前组织）
├── /payrolls                 # 薪资单管理（自动使用当前组织）
├── /transactions             # 交易管理（自动使用当前组织）
├── /safe                     # Safe 钱包信息查询
└── /dashboard                # 仪表板（自动使用当前组织）
```

**说明**：

- `/organizations` (复数)：组织列表和查看相关，用户可以有多个组织
  - `GET /organizations` - 获取所有组织列表，用于组织选择器
  - `GET /organizations/:id` - 查看某个组织的信息（只读，用户必须是成员）

- `/session` (会话)：组织选择和切换
  - `GET /companies/available` - 获取可用组织列表
  - `POST /session/select-company` - 选择组织（第一次）
  - `POST /session/switch-company` - 切换到不同组织
  - `GET /session` - 获取当前会话信息

- `/organization` (单数)：当前组织的管理操作，所有写操作都针对当前组织
  - `GET /organization` - 获取当前组织详情
  - `POST /organization/safe-wallets` - 给当前组织添加 Safe 钱包
  - `POST /organization/admins` - 给当前组织添加管理员

- 其他所有业务接口自动使用 JWT 中的当前组织 ID

### 4.2 详细 API 端点

#### 4.2.1 Auth（认证）

##### 获取登录 Nonce

```
GET /api/enterprise/auth/nonce?walletAddress={address}

Response:
{
  nonce: string
  message: string  // SIWE 消息
}
```

##### 验证签名并登录

```
POST /api/enterprise/auth/login

Request:
{
  walletAddress: string
  signature: string
  message: string
}

Response:
{
  accessToken: string  // 第一阶段JWT（无currentOrganizationId）
  tokenType: "Bearer"
  expiresIn: 86400
  user: {
    id: string
    address: string
    ensName: null
    role: "enterprise_admin"
    hasCompanies: boolean
    needsCompanySelection: true
  }
}

说明：
- 登录后返回**无组织上下文**的Token
- 该Token只能用于：获取组织列表、创建组织、选择组织
- 必须调用 `/session/select-company` 获取带组织上下文的Token才能访问业务资源
```

##### 获取当前用户信息

```
GET /api/enterprise/auth/me

Headers: Authorization: Bearer {token}

Response:
{
  id: string
  walletAddress: string
  email?: string
  currentOrganization?: {
    id: string
    name: string
    role: string
  }
}
```

#### 4.2.2 Organization（组织管理）

##### 创建组织

```
POST /api/enterprise/organizations

Request:
{
  name: string
  email: string
  safeAddress: string
  chainId: number
}

Response:
{
  id: string
  name: string
  email: string
  safeWallet: {
    address: string
    chainId: number
    threshold: number
    owners: string[]
  }
  role: 'ADMIN'
}

Note: 创建成功后，自动将该组织设置为当前组织
```

##### 获取用户的组织列表

```
GET /api/enterprise/organizations

Response:
{
  data: Array<{
    id: string
    name: string
    email: string
    role: string
    isCurrent: boolean  // 是否为当前选中的组织
    safeWallets: Array<{
      address: string
      chainId: number
      isActive: boolean
    }>
  }>
}

Note: 返回当前用户所属的所有组织，用于组织切换选择器
```

##### 获取可用组织列表

```
GET /api/enterprise/companies/available

Headers: Authorization: Bearer {token_without_company}

Response:
{
  companies: Array<{
    id: string
    name: string
    role: string
    memberCount: number
    employeeCount: number
    createdAt: string
  }>
  total: number
  lastSelectedCompanyId: string | null
}

Note:
- 使用第一阶段Token（无组织上下文）调用
- 返回用户有权访问的所有组织
- lastSelectedCompanyId 为用户上次使用的组织ID，可用于自动选择
```

##### 选择/切换组织

```
POST /api/enterprise/session/select-company (选择组织)
POST /api/enterprise/session/switch-company (切换组织)

Request:
{
  companyId: string
}

Response:
{
  accessToken: string  // 第二阶段JWT（包含currentOrganizationId）
  tokenType: "Bearer"
  expiresIn: 86400
  company: {
    id: string
    name: string
    role: string
  }
  redirectTo: string  // 建议跳转路径
}

Note:
- 选择/切换成功后返回新的 JWT Token（包含currentOrganizationId）
- 前端需要更新本地存储的 Token
- 后续所有请求使用新 Token，自动使用该组织的数据
```

##### 获取当前Session信息

```
GET /api/enterprise/session

Headers: Authorization: Bearer {token}

Response:
{
  user: {
    id: string
    address: string
    ensName: string | null
  }
  currentCompany: {
    id: string
    name: string
    role: string
  } | null
  availableCompanies: Array<{
    id: string
    name: string
    role: string
    memberCount: number
    employeeCount: number
    createdAt: string
  }>
}

Note:
- 返回当前Session的完整信息
- 包含用户信息、当前组织和所有可用组织
```

##### 查看指定组织信息

```
GET /api/enterprise/organizations/:id

Response:
{
  id: string
  name: string
  email: string
  role: string  // 当前用户在该组织的角色
  safeWallets: Array<{
    id: string
    address: string
    chainId: number
    isActive: boolean
  }>
  memberCount: number
}

Note:
- 只读接口，用于查看用户所属的其他组织信息
- 用户必须是该组织的成员，否则返回 403
- 不包含敏感信息（如完整成员列表）
```

#### 4.2.3 Organization（当前组织管理）

##### 获取当前组织详情

```
GET /api/enterprise/organization

Response:
{
  id: string
  name: string
  email: string
  role: string  // 当前用户角色
  safeWallets: Array<{
    id: string
    address: string
    chainId: number
    threshold: number
    owners: string[]
    isActive: boolean
  }>
  members: Array<{
    userId: string
    walletAddress: string
    role: string
    joinedAt: DateTime
  }>
}

Note: 返回当前组织的完整信息，包括所有成员和 Safe 钱包详情
```

##### 添加 Safe 钱包

```
POST /api/enterprise/organization/safe-wallets

Request:
{
  address: string
  chainId: number
}

Response:
{
  id: string
  address: string
  chainId: number
  threshold: number
  owners: string[]
}

Note:
- 自动添加到当前组织
- 需要 ADMIN 权限
- 会验证当前用户是否为该 Safe 的 owner
```

##### 添加管理员

```
POST /api/enterprise/organization/admins

Request:
{
  walletAddress: string
}

Response:
{
  success: boolean
  member: {
    userId: string
    walletAddress: string
    role: 'ADMIN'
  }
}

Note:
- 给当前组织添加管理员
- 需要当前用户是 ADMIN
- 如果钱包地址不存在，会自动创建用户
```

#### 4.2.4 Employee（员工管理）

##### 获取员工列表

```
GET /api/enterprise/employees?page=1&limit=20

Query Parameters:
- page: number (默认 1)
- limit: number (默认 20)
- search?: string (搜索姓名/地址)
- isActive?: boolean

Response:
{
  data: Array<{
    id: string
    name: string
    walletAddress: string
    ensName?: string
    defaultSalary: string
    defaultToken: string
    paymentFrequency: string
    isActive: boolean
  }>
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

Note: 自动使用当前组织的员工数据
```

##### 创建员工

```
POST /api/enterprise/employees

Request:
{
  name: string
  walletAddress: string
  defaultSalary: string
  defaultToken: string
  paymentFrequency: 'MONTHLY' | 'ONE_OFF'
}

Response:
{
  id: string
  name: string
  walletAddress: string
  ensName?: string
  defaultSalary: string
  defaultToken: string
  paymentFrequency: string
}

Note: 自动添加到当前组织
```

##### 更新员工

```
PATCH /api/enterprise/employees/:id

Request:
{
  name?: string
  walletAddress?: string
  defaultSalary?: string
  defaultToken?: string
  paymentFrequency?: 'MONTHLY' | 'ONE_OFF'
  isActive?: boolean
}

Response: (同创建员工)
```

##### 删除员工

```
DELETE /api/enterprise/employees/:id

Response:
{
  success: boolean
}
```

##### 获取员工支付历史

```
GET /api/enterprise/employees/:id/payment-history?page=1&limit=20

Response:
{
  data: Array<{
    id: string
    payrollId: string
    payrollTitle: string
    amount: string
    tokenSymbol: string
    status: string
    createdAt: DateTime
  }>
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
```

##### 批量导入员工（CSV）

```
POST /api/enterprise/employees/import

Request: multipart/form-data
{
  file: File (CSV)
}

Response:
{
  success: number
  failed: number
  errors: Array<{
    row: number
    error: string
  }>
}

Note: 自动导入到当前组织
```

##### 导出员工（CSV）

```
GET /api/enterprise/employees/export

Response: CSV File

Note: 导出当前组织的员工数据
```

#### 4.2.5 Payroll（薪资单管理）

##### 获取薪资单列表

```
GET /api/enterprise/payrolls?page=1&limit=20

Query Parameters:
- page: number
- limit: number
- status?: string
- type?: 'MONTHLY' | 'ONE_OFF'

Response:
{
  data: Array<{
    id: string
    title: string
    type: string
    status: string
    totalAmount: object
    employeeCount: number
    createdAt: DateTime
  }>
  pagination: {...}
}

Note: 自动返回当前组织的薪资单
```

##### 创建薪资单草稿

```
POST /api/enterprise/payrolls/draft

Request:
{
  safeWalletId: string
  title: string
  type: 'MONTHLY' | 'ONE_OFF'
  employeeIds: string[]
  paymentRecords?: Array<{  // 可选：自定义发薪金额
    employeeId: string
    amount: string
    tokenAddress: string
  }>
}

Response:
{
  id: string
  title: string
  type: string
  status: 'DRAFT'
  paymentRecords: Array<{
    employeeId: string
    employeeName: string
    recipientAddress: string
    amount: string
    tokenAddress: string
    tokenSymbol: string
  }>
  totalAmount: object
}

Note:
- 自动创建到当前组织，使用当前组织的 Safe 钱包
- 如果提供 paymentRecords，使用自定义金额；否则使用员工默认薪资
```

##### 更新薪资单草稿

```
PATCH /api/enterprise/payrolls/:id/draft

Request:
{
  paymentRecords: Array<{
    employeeId: string
    amount: string
    tokenAddress: string
  }>
}

Response: (同创建草稿)
```

##### 创建 Safe 交易

```
POST /api/enterprise/payrolls/:id/create-transaction

Request:
{
  walletAddress: string  // 用于签名的钱包地址，必须是 Safe 的 owner
}

Response:
{
  payrollId: string
  safeTxHash: string
  safeAddress: string
  chainId: number
  threshold: number
  nonce: number
  transactionData: {
    safeTransaction: object  // Safe SDK 创建的完整交易对象
    safeTxHash: string
    safeAddress: string
    chainId: number
    threshold: number
    nonce: number
  }
}

Note:
- 前端必须提供 walletAddress，该地址必须是 Safe 的 owner
- 后端使用 Safe SDK 创建交易并返回 safeTxHash 和交易数据
- 前端使用返回的数据进行签名
```

##### 提交签名并提案交易

```
POST /api/enterprise/payrolls/:id/submit-signature

Request:
{
  safeTxHash: string
  signature: string
  signerAddress: string
  safeTransactionData: {
    safeAddress: string
    chainId: number
    transactions: Array<{
      to: string
      value: string
      data: string
    }>
    nonce: number
    safeTxHash: string
    threshold: number
    owners: string[]
  }
}

Response:
{
  id: string
  status: 'PROPOSED'
  transaction: {
    safeTxHash: string
    nonce: number
    confirmations: number
    confirmationsRequired: number
    safeAppUrl: string  // Safe 官方应用签名链接
  }
}

Note:
- 前端必须提供完整的 SafeTransactionData
- 后端验证签名和交易数据后提交到 Safe Transaction Service
- safeTxHash 必须与 safeTransactionData.safeTxHash 一致
```

##### 获取薪资单详情

```
GET /api/enterprise/payrolls/:id

Response:
{
  id: string
  title: string
  type: string
  status: string
  totalAmount: object
  employeeCount: number
  paymentRecords: Array<{
    id: string
    employeeId: string
    employeeName: string
    recipientAddress: string
    amount: string
    tokenAddress: string
    tokenSymbol: string
    status: string
  }>
  transaction?: {
    safeTxHash: string
    ethereumTxHash?: string
    status: string
    confirmations: number
    confirmationsRequired: number
    signatures: Array<{
      signerAddress: string
      signedAt: DateTime
    }>
    safeAppUrl: string
  }
  createdAt: DateTime
  updatedAt: DateTime
}
```

##### 从已有薪资单创建新薪资单

```
POST /api/enterprise/payrolls/:id/duplicate

Response: (同创建草稿)
```

##### 取消薪资单

```
POST /api/enterprise/payrolls/:id/cancel

Response:
{
  success: boolean
}
```

#### 4.2.6 Transaction（交易管理）

##### 获取交易列表

```
GET /api/enterprise/transactions?safeWalletId={id}&page=1&limit=20

Query Parameters:
- safeWalletId?: string (可选，不传则返回当前组织所有 Safe 的交易)
- page: number
- limit: number

Response:
{
  data: Array<{
    id: string
    safeTxHash: string
    ethereumTxHash?: string
    status: string
    confirmations: number
    confirmationsRequired: number
    payrollId?: string
    createdAt: DateTime
  }>
  pagination: {...}
}

Note: 只返回当前组织的交易数据
```

##### 获取交易详情

```
GET /api/enterprise/transactions/:id

Response:
{
  id: string
  safeTxHash: string
  ethereumTxHash?: string
  status: string
  confirmations: number
  confirmationsRequired: number
  signatures: Array<{
    signerAddress: string
    signedAt: DateTime
  }>
  safeAppUrl: string
  data: object
  createdAt: DateTime
  executedAt?: DateTime
}
```

##### 同步交易状态

```
POST /api/enterprise/transactions/:id/sync

Response:
{
  status: string
  confirmations: number
  ethereumTxHash?: string
}
```

#### 4.2.7 Safe（Safe 钱包信息）

##### 获取 Safe 钱包信息

```
GET /api/enterprise/safe/:address/info?chainId={id}

Response:
{
  address: string
  chainId: number
  threshold: number
  owners: string[]
  nonce: number
}
```

##### 获取 Safe 钱包余额

```
GET /api/enterprise/safe/:address/balances?chainId={id}

Response:
{
  balances: Array<{
    tokenAddress: string
    tokenSymbol: string
    tokenName: string
    decimals: number
    balance: string
    fiatBalance?: string
    fiatConversion?: string
  }>
}
```

##### 验证用户是否为 Safe 所有者

```
POST /api/enterprise/safe/verify-owner

Request:
{
  safeAddress: string
  chainId: number
  userAddress: string
}

Response:
{
  isOwner: boolean
  threshold: number
  owners: string[]
}
```

#### 4.2.8 Dashboard（仪表板）

##### 获取仪表板概览

```
GET /api/enterprise/dashboard/overview

Response:
{
  organization: {
    id: string
    name: string
  }
  safeWallet: {
    address: string
    chainId: number
    balances: Array<{
      tokenSymbol: string
      balance: string
      fiatBalance?: string
    }>
  }
  pendingTasks: {
    count: number
    items: Array<{
      payrollId: string
      title: string
      status: string
      confirmations: number
      confirmationsRequired: number
    }>
  }
  recentActivity: {
    count: number
    items: Array<{
      payrollId: string
      title: string
      status: string
      totalAmount: object
      createdAt: DateTime
      executedAt?: DateTime
    }>
  }
  statistics: {
    totalEmployees: number
    totalPayrollsThisMonth: number
    totalAmountThisMonth: object
  }
}

Note: 自动返回当前组织的仪表板数据
```

---

## 5. 技术实现要点

### 5.1 认证与授权

#### SIWE 认证流程（两阶段Token）

**第一阶段：钱包认证**

1. 前端请求签名消息 (GET `/enterprise/auth/message`)
2. 前端使用钱包签名 SIWE 消息
3. 后端验证签名并生成**无组织上下文**的 JWT (POST `/enterprise/auth/login`)
4. 返回Token（不包含currentOrganizationId）

**第二阶段：组织选择** 5. 前端获取可用组织列表 (GET `/enterprise/companies/available`) 6. 根据组织数量自动处理（0个创建，1个自动选择，多个显示选择界面）7. 选择组织 (POST `/enterprise/session/select-company`) 8. 返回**带组织上下文**的新Token（包含currentOrganizationId）9. 后续请求携带新JWT访问业务资源

#### JWT 策略

- Access Token 有效期：24 小时
- **第一阶段Token**包含：userId, walletAddress
- **第二阶段Token**包含：userId, walletAddress, currentOrganizationId
- 使用 `@nestjs/jwt` 处理
- 切换组织时重新签发包含新 organizationId 的 Token

#### 当前组织管理

```typescript
// JWT Payload 结构
interface JwtPayload {
  userId: string
  walletAddress: string
  currentOrganizationId?: string  // 当前选中的组织
  iat: number
  exp: number
}

// 切换组织流程
1. POST /session/switch-company
2. 验证用户是否属于该组织
3. 重新签发 JWT，更新 currentOrganizationId
4. 前端更新 Token，后续请求自动使用新组织
```

#### 权限守卫

- `JwtAuthGuard`: 验证 JWT
- `OrganizationGuard`: 验证用户是否属于组织，并注入当前组织上下文
- `AdminGuard`: 验证用户是否为当前组织的管理员

#### 组织上下文装饰器

```typescript
// 自定义装饰器，用于在 Controller 中获取当前组织
@Get('/employees')
@UseGuards(JwtAuthGuard, OrganizationGuard)
async getEmployees(@CurrentOrganization() org: Organization) {
  // org 自动从 JWT 中的 currentOrganizationId 获取
  return this.employeeService.findAll(org.id);
}
```

### 5.2 Safe SDK 集成

#### 主要 SDK 包

```json
{
  "@safe-global/api-kit": "^2.0.0",
  "@safe-global/protocol-kit": "^2.0.0",
  "@safe-global/safe-core-sdk-types": "^2.0.0"
}
```

#### SafeService 核心方法

```typescript
class SafeService {
  // 获取 Safe 信息
  async getSafeInfo(address: string, chainId: number);

  // 验证所有者
  async verifyOwner(safeAddress: string, ownerAddress: string, chainId: number);

  // 获取余额
  async getBalances(address: string, chainId: number);

  // 创建批量交易（后端使用 Safe SDK 创建交易）
  async createBatchTransaction(
    safeAddress: string,
    transactions: Array<{ to: string; value: string; data: string }>,
    chainId: number,
    walletAddress: string, // 用于签名的钱包地址
  ): Promise<{
    safeTxHash: string;
    transactionData: any;
    safeAddress: string;
    chainId: number;
    threshold: number;
    nonce: number;
  }>;

  // 提交签名并提案交易
  async proposeTransactionWithSignature(
    safeAddress: string,
    safeTxHash: string,
    transactionData: SafeTransactionData,
    signature: string,
    signerAddress: string,
    chainId: number,
  ): Promise<SafeMultisigTransaction>;

  // 获取交易状态
  async getTransactionStatus(safeTxHash: string, chainId: number);
}
```

#### 薪资单提案流程（后端主导 RPC）

```typescript
// 步骤 1：前端提供钱包地址，后端创建 Safe 交易
POST /api/enterprise/payrolls/:id/create-transaction
Request: { walletAddress: string }  // 必须是 Safe 的 owner
→ 后端验证 walletAddress 是 Safe 的 owner
→ 后端使用 Safe SDK 创建完整的 Safe 交易
→ 返回 safeTxHash、safeTransaction 和交易数据

// 步骤 2：前端签名 safeTxHash
→ 用户钱包签名 safeTxHash
→ 前端使用返回的 safeTransaction 数据

// 步骤 3：后端提交签名并提案
POST /api/enterprise/payrolls/:id/submit-signature
→ 前端提供签名和 safeTransactionData
→ 后端验证签名和交易数据后提交到 Safe Transaction Service
→ 返回 Safe App URL 和交易状态

// 步骤 5：收集签名（在 Safe App 中）
→ 其他 Safe owners 在 Safe App 中签名
→ 达到阈值后状态变为 EXECUTABLE

// 步骤 6：执行交易（在 Safe App 中）
→ 任何 Safe owner 在 Safe App 中点击 Execute
→ 执行者从个人钱包支付 gas 费
→ 交易上链，状态变为 EXECUTED

// 步骤 7：自动监控
→ 定时任务每 30 秒同步交易状态
→ 更新数据库中的交易和薪资单状态
```

### 5.3 数据库设计

#### Prisma Schema 示例

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String   @id @default(uuid())
  walletAddress String   @unique
  email         String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  organizationMembers OrganizationMember[]
}

model Organization {
  id        String   @id @default(uuid())
  name      String
  email     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  members     OrganizationMember[]
  safeWallets SafeWallet[]
  employees   Employee[]
  payrolls    Payroll[]
}

// ... 其他模型
```

### 5.4 交易状态同步

#### 定时任务

使用 `@nestjs/schedule` 实现定时同步

```typescript
@Injectable()
export class TransactionSyncService {
  @Cron('*/30 * * * * *') // 每 30 秒
  async syncPendingTransactions() {
    // 查询所有待处理的交易
    // 调用 Safe API 获取最新状态
    // 更新数据库
  }
}
```

### 5.5 CSV 处理

#### 导入格式

```csv
name,walletAddress,defaultSalary,defaultToken,paymentFrequency
John Doe,0x1234...,5000,0xA0b8...,MONTHLY
Jane Smith,vitalik.eth,6000,0xA0b8...,MONTHLY
```

#### 导出格式

同导入格式，包含所有员工信息

### 5.6 错误处理

#### 统一错误格式

```typescript
{
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
}
```

#### 自定义异常

- `WalletNotOwnerException`: 钱包不是 Safe 所有者
- `InsufficientBalanceException`: 余额不足
- `InvalidSafeAddressException`: 无效的 Safe 地址
- `PayrollNotDraftException`: 薪资单不是草稿状态

---

## 6. 安全性考虑

### 6.1 核心安全原则

1. **非托管原则**:
   - 后端**永不持有**私钥或助记词
   - 前端只负责**签名操作**（使用用户钱包）
   - 后端负责交易创建和 RPC 调用（使用只读 provider）

2. **职责分离**:
   - 后端：数据管理、交易创建（Safe SDK）、RPC 调用、状态同步
   - 前端：签名 safeTxHash（用户钱包签名）
   - 所有与 Safe Transaction Service 的交互由后端完成

3. **所有者验证**: 创建组织时必须验证用户是 Safe 所有者

### 6.2 Gas 费用说明

#### 谁支付 Gas 费？

Safe 多签交易的 gas 费由**执行交易的人**支付，具体说明：

**提案和签名阶段（免费）**：

- ✅ 创建交易（后端调用 Safe Transaction Service API）- 免费
- ✅ 签名交易（链下签名）- 免费
- ✅ 其他 owners 在 Safe App 签名 - 免费

**执行阶段（需要 gas）**：

- 💰 当签名达到阈值后，任何 Safe owner 可以在 Safe App 中执行交易
- 💰 执行者需要从**个人钱包**支付 gas 费（不从 Safe 钱包扣除）
- 💰 Gas 费金额取决于网络（Ethereum: ~$5-20, Polygon: ~$0.01-0.1）

**Gas 费不会从以下扣除**：

- ❌ 不从 Safe 钱包余额扣除
- ❌ 不从员工薪资扣除
- ✅ 只从执行者的个人钱包扣除

**建议**：

- 公司可以设立 gas 费报销政策
- 执行者在执行前需确保个人钱包有足够的 ETH/MATIC 等原生代币
- 可以指定专人负责执行交易

### 6.3 安全措施

- 所有 API 需要 JWT 认证
- 组织级操作需验证用户权限
- Safe 地址格式验证（Checksum）
- 金额计算使用 BigNumber 库
- SQL 注入防护（Prisma ORM）
- XSS 防护（输入验证）
- CORS 配置
- Rate Limiting

---

## 7. 部署与运维

### 7.1 环境变量

```env
# 应用配置
PORT=3000
NODE_ENV=production

# 数据库
DATABASE_URL=postgresql://user:password@localhost:5432/safe_payroll

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# Safe
SAFE_SERVICE_URL=https://safe-transaction-mainnet.safe.global

# 区块链 RPC
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/your-key
```

### 7.2 部署架构

```
[Frontend] → [Load Balancer] → [NestJS App] → [PostgreSQL]
                                     ↓
                              [Safe API / RPC]
```

---

## 9. 前端集成示例

### 9.0 RainbowKit 架构说明

本项目使用 **RainbowKit + wagmi** 作为前端钱包连接架构：

- **RainbowKit**: 提供美观的钱包连接 UI 组件
- **wagmi**: 提供 React hooks 用于与以太坊交互
- **@safe-global/protocol-kit**: Safe 多签钱包 SDK

**主要优势**:

- 支持多种钱包（MetaMask, WalletConnect, Coinbase Wallet 等）
- 类型安全的 React hooks
- 自动处理钱包连接状态
- 与 Safe SDK 完美集成

**基础配置示例**:

```typescript
// App.tsx
import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultWallets, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { configureChains, createConfig, WagmiConfig } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';

const { chains, publicClient } = configureChains(
  [mainnet, sepolia],
  [publicProvider()]
);

const { connectors } = getDefaultWallets({
  appName: 'Safe Payroll',
  projectId: 'YOUR_PROJECT_ID', // 从 WalletConnect 获取
  chains,
});

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
});

export default function App() {
  return (
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider chains={chains}>
        <YourApp />
      </RainbowKitProvider>
    </WagmiConfig>
  );
}
```

### 9.1 完整的用户流程

#### 场景 1：首次登录用户（无组织）

```typescript
import { useConnect, useSignMessage, useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';

// 在 React 组件中
const { address, isConnected } = useAccount();
const { signMessageAsync } = useSignMessage();

// 1. 连接钱包（通过 RainbowKit ConnectButton）
// <ConnectButton />

// 2. 获取 nonce
const { nonce, message } = await fetch(`/api/enterprise/auth/nonce?walletAddress=${address}`);

// 3. 签名
const signature = await signMessageAsync({
  message: message,
});

// 4. 登录
const { accessToken, user } = await fetch('/api/enterprise/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ walletAddress: address, signature, message }),
});

// 5. 检查是否有组织
if (!user.hasOrganization) {
  // 引导用户创建组织
  const org = await fetch('/api/enterprise/organizations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: { name: 'My Company', email: 'ceo@company.com', safeAddress: '0x...', chainId: 1 },
  });
  // 创建成功后，token 自动包含该组织 ID
  // 跳转到 Dashboard
} else {
  // 已有组织，直接进入 Dashboard
  // 或显示组织选择器
}
```

#### 场景 2：切换组织

```typescript
// 1. 获取用户所属的所有组织
const { data: organizations } = await fetch('/api/enterprise/organizations', {
  headers: { Authorization: `Bearer ${accessToken}` },
});

// 2. 显示组织选择器，用户选择一个组织
const selectedOrgId = '...';

// 3. 切换组织
const { success, organization } = await fetch(
  `/api/enterprise/organizations/${selectedOrgId}/switch`,
  {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  },
);

// 4. 后端返回新的 token（在响应头或响应体中）
// 前端更新 token
localStorage.setItem('accessToken', newToken);

// 5. 刷新页面或重新加载数据
// 所有后续请求自动使用新组织
```

#### 场景 3：正常业务操作

```typescript
// 获取员工列表（不需要传 organizationId）
const employees = await fetch('/api/enterprise/employees', {
  headers: { Authorization: `Bearer ${accessToken}` },
});

// 创建薪资单（不需要传 organizationId）
const payroll = await fetch('/api/enterprise/payrolls/draft', {
  method: 'POST',
  headers: { Authorization: `Bearer ${accessToken}` },
  body: {
    safeWalletId: 'xxx',
    title: '2025-10 工资',
    type: 'MONTHLY',
    employeeIds: ['emp1', 'emp2'],
  },
});

// 所有操作都自动使用当前组织，前端代码更简洁
```

#### 场景 4：提案并执行薪资单交易

```typescript
// 1. 创建 Safe 交易
const { safeTxHash, nonce, safeAddress, chainId, threshold } = await fetch(
  `/api/enterprise/payrolls/${payrollId}/create-transaction`,
  {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  },
).then((r) => r.json());

// 2. 使用 RainbowKit 获取钱包连接和签名
import { useSignMessage, useAccount } from 'wagmi';
import { Safe } from '@safe-global/protocol-kit';

// 在 React 组件中
const { address, isConnected } = useAccount();
const { signMessageAsync } = useSignMessage();

// 用户钱包签名
const signature = await signMessageAsync({
  message: safeTxHash,
});

// 3. 使用 Safe SDK 创建完整的 Safe 交易数据
// 注意：RainbowKit 使用 wagmi，需要通过 wagmi 获取 provider
import { usePublicClient } from 'wagmi';

const publicClient = usePublicClient();
const provider = publicClient?.transport?.value || publicClient;

const safe = await Safe.init({ provider, safeAddress });
const safeTransaction = await safe.createTransaction({
  transactions: transactionData.transactions,
  // ... 其他参数
});

// 确保 safeTransactionData 包含所有必需字段
const safeTransactionData = {
  safeAddress: safeAddress,
  chainId: chainId,
  transactions: transactionData.transactions,
  nonce: nonce,
  safeTxHash: safeTxHash,
  threshold: threshold,
  owners: transactionData.owners,
};

// 4. 提交签名到后端
const { transaction } = await fetch(`/api/enterprise/payrolls/${payrollId}/submit-signature`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    safeTxHash,
    signature,
    signerAddress: await signer.getAddress(),
    safeTransactionData,
  }),
}).then((r) => r.json());

// 5. 引导用户到 Safe App 执行交易
if (transaction.status === 'EXECUTABLE') {
  // 已达到签名阈值，可以执行
  alert('签名已收集完成！请在 Safe App 中执行交易。执行者需要支付 gas 费。');
  window.open(transaction.safeAppUrl, '_blank');
} else {
  // 还需要更多签名
  alert(`交易已提案！当前签名: ${transaction.confirmations}/${transaction.confirmationsRequired}`);
  alert('请其他 Safe owners 在 Safe App 中签名');
  window.open(transaction.safeAppUrl, '_blank');
}

// 6. 前端可以轮询或通过 WebSocket 监听交易状态变化
const checkStatus = setInterval(async () => {
  const { status } = await fetch(`/api/enterprise/transactions/${transactionId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  }).then((r) => r.json());

  if (status === 'EXECUTED') {
    clearInterval(checkStatus);
    alert('薪资发放成功！');
  } else if (status === 'FAILED') {
    clearInterval(checkStatus);
    alert('交易执行失败，请检查');
  }
}, 5000); // 每5秒检查一次
```

### 9.2 Token 管理最佳实践

```typescript
// API Client 封装
class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('accessToken', token);
  }

  async request(url: string, options: RequestInit = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${this.token}`,
      },
    });

    // 检查是否返回了新 token（切换组织后）
    const newToken = response.headers.get('X-New-Token');
    if (newToken) {
      this.setToken(newToken);
    }

    return response.json();
  }

  // 切换组织的便捷方法
  async switchOrganization(orgId: string) {
    const result = await this.request(`/api/enterprise/organizations/${orgId}/switch`, {
      method: 'POST',
    });
    // Token 已自动更新
    return result;
  }
}
```

### 9.3 前端状态管理建议

```typescript
// 使用 Redux/Zustand/Context 管理当前组织
interface AppState {
  user: User | null;
  currentOrganization: Organization | null;
  organizations: Organization[];
}

// 解析 JWT 获取当前组织 ID
function parseJWT(token: string) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  return {
    userId: payload.userId,
    walletAddress: payload.walletAddress,
    currentOrganizationId: payload.currentOrganizationId,
  };
}

// 初始化时
const tokenPayload = parseJWT(accessToken);
if (tokenPayload.currentOrganizationId) {
  // 获取当前组织详情
  const org = await fetch(`/api/enterprise/organizations/${tokenPayload.currentOrganizationId}`);
  setState({ currentOrganization: org });
}
```

---

## 10. 附录

### 10.1 状态枚举定义

#### OrganizationRole

- `ADMIN`: 管理员
- `MEMBER`: 普通成员

#### PaymentFrequency

- `MONTHLY`: 按月发薪
- `ONE_OFF`: 单次发薪

#### PayrollStatus

- `DRAFT`: 草稿（可编辑）
- `PROPOSED`: 已提案到 Safe（等待签名）
- `EXECUTED`: 已执行（交易上链成功）
- `FAILED`: 执行失败
- `CANCELLED`: 已取消

**状态流转**：

```
DRAFT → PROPOSED → EXECUTED
  ↓                    ↓
CANCELLED         FAILED
```

#### TransactionStatus

- `PROPOSED`: 已提案到 Safe Transaction Service（第一个签名已提交）
- `AWAITING_SIGNATURES`: 等待更多签名（未达到阈值）
- `EXECUTABLE`: 可执行（签名已达到阈值，等待任何 owner 在 Safe App 中执行）
- `EXECUTED`: 已执行（交易已上链）
- `FAILED`: 执行失败
- `CANCELLED`: 已取消

**状态流转**：

```
PROPOSED → AWAITING_SIGNATURES → EXECUTABLE → EXECUTED
                                                   ↓
                                               FAILED
```

**注意**：

- 从 `PROPOSED` 到 `EXECUTED` 的过程中，后端定时任务会自动同步状态
- `EXECUTABLE` 状态表示可以执行，但需要在 Safe App 中手动点击 Execute
- 执行者需要支付 gas 费

#### PaymentStatus

- `PENDING`: 待处理
- `COMPLETED`: 已完成
- `FAILED`: 失败

### 10.2 代币标准支持

- ERC20 代币
- 原生代币（ETH）
- 未来可扩展：ERC721, ERC1155

### 10.3 支持的区块链网络

- Ethereum Mainnet (chainId: 1)
- Goerli (chainId: 5)
- Sepolia (chainId: 11155111)
- Polygon (chainId: 137)
- 可配置扩展其他 Safe 支持的网络

### 10.4 重要技术说明

#### Nonce 的重要性

在 Safe 多签交易中，`nonce` 是一个关键参数：

1. **唯一性保证**: 每个 Safe 钱包的 nonce 必须递增，确保交易顺序
2. **重放攻击防护**: 防止相同的交易被重复执行
3. **前端验证**: 前端可以使用 nonce 验证交易的有效性
4. **状态同步**: 后端通过 nonce 跟踪 Safe 钱包的状态

**API 响应中的 nonce**:

- `POST /api/enterprise/payrolls/:id/create-transaction` 返回当前 Safe 的 nonce
- 前端签名时可以使用 nonce 进行额外验证
- 后端在提案交易时会验证 nonce 的一致性

**注意事项**:

- nonce 由后端从 Safe Transaction Service 获取，确保准确性
- 如果获取 nonce 失败，后端会使用 0 作为默认值
- 前端应该信任后端提供的 nonce，不需要自己查询

#### SafeTransactionData 的重要性

在提交签名时，前端必须提供完整的 `SafeTransactionData`，包含以下字段：

```typescript
{
  safeAddress: string;        // Safe 钱包地址
  chainId: number;           // 链 ID
  transactions: Array<{      // 交易数组
    to: string;              // 接收地址
    value: string;           // 转账金额（wei）
    data: string;            // 交易数据
  }>;
  nonce: number;            // 交易 nonce
  safeTxHash: string;       // Safe 交易哈希
  threshold: number;        // 签名阈值
  owners: string[];         // 所有者地址列表
}
```

**注意**: 后端使用严格的 DTO 验证，确保所有字段都符合预期格式。

1. **数据一致性**: 确保 `safeTxHash` 与 `SafeTransactionData` 完全匹配
2. **后端验证**: 后端会验证交易数据的完整性和正确性
3. **安全防护**: 防止恶意或错误的交易数据被提交

**前端职责**:

- 使用 Safe SDK 创建正确的 Safe 交易
- 提供完整的 `SafeTransactionData` 给后端
- 确保 `safeTxHash` 与交易数据一致

**后端职责**:

- 验证 `safeTxHash` 与 `SafeTransactionData.safeTxHash` 的一致性
- 验证签名者的身份和权限
- 将验证通过的交易提案到 Safe Transaction Service
