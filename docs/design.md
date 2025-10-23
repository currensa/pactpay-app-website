# Safe Payroll 系统设计文档

## 1. 系统概述

Safe Payroll 是一个基于 Safe 多签钱包的薪资管理系统，面向项目负责人（CEO、财务经理）提供安全、便捷的薪资发放管理功能。系统严格遵循非托管原则，所有与 Safe 钱包的交互都通过 Safe{Core} SDK 完成。

### 1.1 核心特性

- Web3 钱包认证（SIWE 标准）
- Safe 多签钱包集成
- 收款人名册管理
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
   - 每个组织的收款人、薪资单、交易数据完全独立
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
│   ├── employee/             # 收款人模块（原员工模块）
│   ├── payroll/              # 薪资单模块
│   ├── transaction/          # 交易模块
│   ├── safe/                 # Safe 钱包集成模块
│   ├── token/                # 代币配置模块
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

#### 2.2.4 Employee Module（收款人模块）

- **职责**:
  - 收款人名册 CRUD 操作
  - CSV 批量导入/导出
  - 收款人历史支付记录查询
- **依赖**: Organization Module, Token Module
- **主要服务**:
  - `EmployeeService`: 收款人业务逻辑
  - `EmployeeCsvService`: CSV 处理
  - `EmployeeRepository`: 数据访问层

#### 2.2.5 Payroll Module（薪资单模块）

- **职责**:
  - 薪资单创建
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
  - 交易执行状态更新
- **依赖**: Safe Module, Payroll Module
- **主要服务**:
  - `TransactionService`: 交易业务逻辑
  - `TransactionSyncService`: 状态同步（定时任务）
  - `TransactionRepository`: 数据访问层

#### 2.2.7 Safe Module（Safe 钱包集成模块）

- **职责**:
  - Safe{Core} API Kit 封装
  - Safe 钱包信息查询
  - 所有者验证
  - 余额查询（多代币）
  - 交易提案（接收前端构造的交易数据）
- **主要服务**:
  - `SafeService`: Safe API Kit 核心服务
  - 注意：不再负责交易构造，只负责 API 调用

#### 2.2.8 Token Module（代币配置模块）

- **职责**:
  - 代币配置管理
  - 支持多链代币
  - 代币信息查询
- **主要服务**:
  - `TokenService`: 代币业务逻辑
  - `TokenRepository`: 数据访问层

#### 2.2.9 Dashboard Module（仪表板模块）

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
  ├── 1:N → PaymentRecipient
  └── 1:N → Payroll

SafeWallet (Safe 钱包)
  ├── N:1 → Organization
  └── 1:N → Transaction

PaymentRecipient (收款人)
  ├── N:1 → Organization
  ├── N:1 → TokenConfig
  └── 1:N → PaymentRecord

Payroll (薪资单)
  ├── N:1 → Organization
  ├── 1:N → PaymentRecord
  └── 1:1 → Transaction

Transaction (交易)
  ├── N:1 → SafeWallet
  └── 1:1 → Payroll

PaymentRecord (支付记录)
  ├── N:1 → Payroll
  └── N:1 → PaymentRecipient

TokenConfig (代币配置)
  ├── 1:N → PaymentRecipient
  └── 1:N → PaymentRecord
```

### 3.2 实体字段设计

#### User（用户表）

```typescript
{
  id: string (UUID)
  walletAddress: string (唯一，以太坊地址)
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
  role: enum ('ADMIN')
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

#### TokenConfig（代币配置表）

```typescript
{
  id: string (UUID)
  chainId: number (链 ID)
  chainName: string (链名称)
  symbol: string (代币符号)
  name: string (代币名称)
  address: string (代币合约地址)
  decimals: number (小数位数)
  logoUrl?: string (代币图标)
  isActive: boolean (是否激活)
  isNative: boolean (是否原生代币)
  createdAt: DateTime
  updatedAt: DateTime
}
```

#### PaymentRecipient（收款人表）

```typescript
{
  id: string (UUID)
  organizationId: string (FK)
  name: string (收款人姓名)
  walletAddress: string (收款人钱包地址)
  ensDomain?: string (ENS 域名)
  defaultAmount: string (默认支付金额，BigNumber 字符串)
  tokenId: string (FK, 关联到 TokenConfig)
  chainId: number (收款人所在链)
  isActive: boolean (是否激活)
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
  status: enum ('DRAFT' | 'PROPOSED' | 'EXECUTED' | 'FAILED' | 'CANCELLED')
  createdBy: string (创建人钱包地址)
  metadata: Json? (存储临时交易数据)
  createdAt: DateTime
  updatedAt: DateTime
}
```

#### PaymentRecord（支付记录表）

```typescript
{
  id: string (UUID)
  payrollId: string (FK)
  recipientId: string (FK, 关联到 PaymentRecipient)
  amount: string (金额，BigNumber 字符串)
  status: enum ('PENDING' | 'COMPLETED' | 'FAILED')
  notes?: string (备注信息)
  createdAt: DateTime
}
```

#### Transaction（交易表）

```typescript
{
  id: string (UUID)
  payrollId: string (FK, 可选)
  safeWalletId: string (FK)
  chainId: number (链 ID)
  safeTxHash: string (Safe 交易哈希)
  ethereumTxHash?: string (以太坊交易哈希)
  status: enum ('PROPOSED' | 'AWAITING_SIGNATURES' | 'EXECUTABLE' | 'EXECUTED' | 'FAILED' | 'CANCELLED')
  confirmations: number (当前签名数)
  confirmationsRequired: number (需要签名数)
  nonce: number
  data: Json (交易原始数据)
  createdAt: DateTime
  executedAt?: DateTime
  updatedAt: DateTime
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
├── /employees                # 收款人管理（自动使用当前组织）
├── /payrolls                 # 薪资单管理（自动使用当前组织）
├── /transactions             # 交易管理（自动使用当前组织）
├── /safe                     # Safe 钱包信息查询
├── /tokens                   # 代币配置管理
└── /dashboard                # 仪表板（自动使用当前组织）
```

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

#### 4.2.4 Employee（收款人管理）

##### 获取收款人列表

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
    ensDomain?: string
    defaultAmount: string
    chainId: number
    token: {
      id: string
      symbol: string
      name: string
      decimals: number
      logoUrl?: string
    }
    isActive: boolean
    recentPayments: Array<{
      id: string
      amount: string
      status: string
      payrollId: string
      payrollTitle: string
      payrollStatus: string
      createdAt: DateTime
    }>
  }>
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

Note: 自动使用当前组织的收款人数据
```

##### 创建收款人

```
POST /api/enterprise/employees

Request:
{
  name: string
  walletAddress: string
  defaultAmount: string
  tokenId: string
  chainId: number
  ensDomain?: string
}

Response:
{
  id: string
  name: string
  walletAddress: string
  ensDomain?: string
  defaultAmount: string
  chainId: number
  token: {
    id: string
    symbol: string
    name: string
    decimals: number
    logoUrl?: string
  }
}

Note: 自动添加到当前组织
```

##### 更新收款人

```
PATCH /api/enterprise/employees/:id

Request:
{
  name?: string
  walletAddress?: string
  defaultAmount?: string
  tokenId?: string
  chainId?: number
  ensDomain?: string
  isActive?: boolean
}

Response: (同创建收款人)
```

##### 删除收款人

```
DELETE /api/enterprise/employees/:id

Response:
{
  success: boolean
}
```

##### 获取收款人支付历史

```
GET /api/enterprise/employees/:id/payment-history?page=1&limit=20

Response:
{
  data: Array<{
    id: string
    amount: string
    status: string
    notes?: string
    payrollId: string
    payrollTitle: string
    payrollStatus: string
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

##### 批量导入收款人（CSV）

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

##### 导出收款人（CSV）

```
GET /api/enterprise/employees/export

Response: CSV File

Note: 导出当前组织的收款人数据
```

#### 4.2.5 Payroll（薪资单管理）

##### 获取薪资单列表

```
GET /api/enterprise/payrolls?page=1&limit=20

Query Parameters:
- page: number
- limit: number
- status?: string

Response:
{
  data: Array<{
    id: string
    title: string
    status: string
    totalAmount: object
    paymentRecords: Array<{
      id: string
      recipientId: string
      recipientName: string
      recipientAddress: string
      amount: string
      status: string
      notes?: string
    }>
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
  paymentRecords: Array<{
    recipientId: string
    amount?: string  // 可选：自定义金额，不提供则使用收款人默认金额
    notes?: string   // 可选：备注
  }>
}

Response:
{
  id: string
  title: string
  status: 'DRAFT'
  paymentRecords: Array<{
    recipientId: string
    recipientName: string
    recipientAddress: string
    amount: string
    status: string
    notes?: string
  }>
  totalAmount: object
}

Note:
- 自动创建到当前组织，使用当前组织的 Safe 钱包
- 如果提供 amount，使用自定义金额；否则使用收款人默认金额
```

##### 更新薪资单草稿

```
PATCH /api/enterprise/payrolls/:id/draft

Request:
{
  paymentRecords: Array<{
    recipientId: string
    amount?: string
    notes?: string
  }>
}

Response: (同创建草稿)
```

##### 获取薪资单草稿信息（用于前端构造交易）

```
POST /api/enterprise/payrolls/:id/get-transaction-data

Request:
{
  walletAddress: string  // 用于签名的钱包地址，必须是 Safe 的 owner
}

Response:
{
  // Safe 信息
  safeAddress: string
  chainId: number
  threshold: number
  owners: string[]
  nonce: number

  // 原始交易数据（供前端构造 Safe 交易）
  rawTransactions: Array<{
    to: string
    value: string
    data: string
  }>

  // 薪资单信息
  payrollId: string
  totalAmount: number
  paymentCount: number
}

Note:
- 前端必须提供 walletAddress，该地址必须是 Safe 的 owner
- 后端只返回草稿信息和原始交易数据，不构造 Safe 交易
- 前端使用 Safe SDK 构造完整的 Safe 交易
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
    to: string
    value: string
    data: string
    operation: number
    safeTxGas: string
    baseGas: string
    gasPrice: string
    gasToken: string
    refundReceiver: string
    nonce: number
    safeTxHash: string
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
- 前端必须提供完整的 SafeTransactionData（由前端使用 Safe SDK 构造）
- 后端验证签名和交易数据后提交到 Safe Transaction Service
- safeTxHash 必须与 safeTransactionData 一致
```

##### 获取薪资单详情

```
GET /api/enterprise/payrolls/:id

Response:
{
  id: string
  title: string
  status: string
  totalAmount: object
  paymentRecords: Array<{
    id: string
    recipientId: string
    recipientName: string
    recipientAddress: string
    amount: string
    status: string
    notes?: string
  }>
  transaction?: {
    safeTxHash: string
    ethereumTxHash?: string
    status: string
    confirmations: number
    confirmationsRequired: number
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
  safeAppUrl: string
  data: object
  payrollId: string
  createdAt: DateTime
  executedAt?: DateTime
}

Note: 签名信息已从模型中移除，不再返回
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

#### 4.2.8 Token（代币配置管理）

##### 获取所有活跃代币

```
GET /api/tokens

Response:
[
  {
    id: string
    chainId: number
    chainName: string
    symbol: string
    name: string
    address: string
    decimals: number
    logoUrl?: string
    isActive: boolean
    isNative: boolean
    createdAt: DateTime
    updatedAt: DateTime
  }
]

Note: 返回所有 isActive: true 的代币，按 chainId 和 symbol 排序
```

##### 按链 ID 获取代币

```
GET /api/tokens/by-chain?chainId={id}

Query Parameters:
- chainId: number (必需)

Response:
[
  {
    id: string
    chainId: number
    chainName: string
    symbol: string
    name: string
    address: string
    decimals: number
    logoUrl?: string
    isActive: boolean
    isNative: boolean
    createdAt: DateTime
    updatedAt: DateTime
  }
]

Note: 返回指定链上的所有活跃代币，按 symbol 排序
```

##### 获取支持的区块链网络

```
GET /api/tokens/chains

Response:
[
  {
    chainId: number
    chainName: string
  }
]

Note: 返回所有支持的区块链网络列表
```

##### 获取代币显示信息

```
GET /api/tokens/display-info?address={address}&chainId={id}

Query Parameters:
- address: string (代币合约地址)
- chainId: number (链 ID)

Response:
{
  symbol: string
  name: string
  chainName: string
  decimals: number
  logoUrl?: string
  isNative: boolean
}

Note:
- 如果代币在配置中不存在，返回默认信息
- 用于前端显示代币信息
```

##### 创建代币配置（管理员功能）

```
POST /api/enterprise/tokens

Request:
{
  chainId: number
  chainName: string
  symbol: string
  name: string
  address: string
  decimals: number
  logoUrl?: string
  isNative?: boolean
}

Response:
{
  id: string
  chainId: number
  chainName: string
  symbol: string
  name: string
  address: string
  decimals: number
  logoUrl?: string
  isActive: boolean
  isNative: boolean
  createdAt: DateTime
  updatedAt: DateTime
}

Note: 需要管理员权限，用于添加新的代币配置
```

##### 更新代币配置（管理员功能）

```
PATCH /api/enterprise/tokens/:id

Request:
{
  chainName?: string
  symbol?: string
  name?: string
  address?: string
  decimals?: number
  logoUrl?: string
  isActive?: boolean
  isNative?: boolean
}

Response: (同创建代币配置)

Note: 需要管理员权限，用于更新现有代币配置
```

##### 删除代币配置（管理员功能）

```
DELETE /api/enterprise/tokens/:id

Response:
{
  success: boolean
}

Note: 需要管理员权限，软删除（设置 isActive: false）
```

#### 4.2.9 Dashboard（仪表板）

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
    totalRecipients: number
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

  // 提案交易（接收前端构造的完整交易数据）
  async proposeTransaction(
    safeAddress: string,
    safeTxHash: string,
    senderAddress: string,
    senderSignature: string,
    chainId: number,
    safeTransactionData: SafeTransactionData,
  ): Promise<any>;

  // 提案交易（便捷方法）
  async proposeTransactionWithSignature(
    safeAddress: string,
    safeTxHash: string,
    senderAddress: string,
    senderSignature: string,
    chainId: number,
    safeTransactionData: SafeTransactionData,
  ): Promise<any>;

  // 获取交易状态
  async getTransactionStatus(safeTxHash: string, chainId: number);
}
```

#### 薪资单提案流程（前端构造交易）

```typescript
// 步骤 1：前端获取草稿信息
POST /api/enterprise/payrolls/:id/get-transaction-data
Request: { walletAddress: string }  // 必须是 Safe 的 owner
→ 后端验证 walletAddress 是 Safe 的 owner
→ 后端返回草稿信息和原始交易数据
→ 前端获得 Safe 信息（地址、链ID、阈值、所有者、nonce）

// 步骤 2：前端使用 Safe SDK 构造交易
→ 前端使用 @safe-global/protocol-kit 创建 Safe 实例
→ 前端使用原始交易数据构造完整的 Safe 交易
→ 前端计算 safeTxHash
→ 前端用户钱包签名 safeTxHash

// 步骤 3：后端提交签名并提案
POST /api/enterprise/payrolls/:id/submit-signature
→ 前端提供签名和完整的 safeTransactionData
→ 后端验证签名和交易数据后提交到 Safe Transaction Service
→ 返回 Safe App URL 和交易状态

// 步骤 4：收集签名（在 Safe App 中）
→ 其他 Safe owners 在 Safe App 中签名
→ 达到阈值后状态变为 EXECUTABLE

// 步骤 5：执行交易（在 Safe App 中）
→ 任何 Safe owner 在 Safe App 中点击 Execute
→ 执行者从个人钱包支付 gas 费
→ 交易上链，状态变为 EXECUTED

// 步骤 6：自动监控
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

  members           OrganizationMember[]
  safeWallets       SafeWallet[]
  paymentRecipients PaymentRecipient[]
  payrolls          Payroll[]
}

model TokenConfig {
  id        String   @id @default(uuid())
  chainId   Int      @map("chain_id")
  chainName String   @map("chain_name")
  symbol    String
  name      String
  address   String
  decimals  Int
  logoUrl   String?  @map("logo_url")
  isActive  Boolean  @default(true) @map("is_active")
  isNative  Boolean  @default(false) @map("is_native")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  paymentRecipients PaymentRecipient[]

  @@unique([chainId, symbol])
  @@unique([id, chainId])
  @@index([chainId])
  @@index([isActive])
  @@map("token_configs")
}

model PaymentRecipient {
  id             String           @id @default(uuid())
  organizationId String           @map("organization_id")
  name           String
  walletAddress  String           @map("wallet_address")
  ensDomain      String?          @map("ens_domain")
  defaultAmount  String           @map("default_amount")
  tokenId        String           @map("token_id")
  chainId        Int              @map("chain_id")
  isActive       Boolean          @default(true) @map("is_active")
  createdAt      DateTime         @default(now()) @map("created_at")
  updatedAt      DateTime         @updatedAt @map("updated_at")

  organization   Organization     @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  paymentRecords PaymentRecord[]
  token          TokenConfig      @relation(fields: [tokenId, chainId], references: [id, chainId])

  @@unique([organizationId, walletAddress, chainId])
  @@index([organizationId])
  @@index([walletAddress])
  @@index([chainId])
  @@map("payment_recipients")
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
name,walletAddress,defaultAmount,tokenId,chainId,ensDomain
John Doe,0x1234...,5000,token-uuid-123,1,john.eth
Jane Smith,vitalik.eth,6000,token-uuid-123,1,
```

#### 导出格式

同导入格式，包含所有收款人信息

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

\*\*执行
