# PactPay App

基于 React + Vite + TypeScript 构建的 Web3 企业薪资支付平台前端，配合 PactPay Server 使用，核心特性为 **StealthPay 隐匿支付**。

---

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 框架 | React 18 + Vite |
| 语言 | TypeScript |
| 路由 | React Router v6 |
| 状态 | Zustand |
| UI | Tailwind CSS + shadcn/ui |
| 钱包 | Reown AppKit (WalletConnect) |
| 密码学 | ethers.js v6 + @noble/curves |

---

## 快速开始

```bash
npm i
npm run dev
```

---

## 项目结构

```
src/
├── apis/           # HTTP 接口封装（account / organization / transaction）
├── components/     # 通用组件
│   └── app/base/  # AuthChecker / EmployeeGuard 等路由守卫
├── layouts/        # OrgLayout（B端）/ EmployeeLayout（C端）/ AccountLayout
├── lib/            # stealth-key 密码学工具
├── router.tsx      # 路由定义
├── stores/         # Zustand 状态（auth / organization）
└── views/
    ├── account/    # 登录 / 注册 / 设置
    ├── orgs/       # B端：组织管理、成员、发薪等
    ├── employee/   # C端：员工工资明细、claim
    └── transaction/
```

---

## 路由说明

| 路径 | 端 | 说明 |
| --- | --- | --- |
| `/account/login` | — | 登录入口（含完整登录流程） |
| `/orgs/*` | B端 | 组织管理（需 token + currentOrgId） |
| `/employee/*` | C端 | 员工端（需 token + metaPub 已提交） |
| `/account/settings/*` | — | 账户设置 |

---

## 登录流程

登录页（`src/views/account/login.tsx`）通过 `FlowStep` 状态机管理以下步骤：

```
welcome → login → checking → ...
```

### 登录后路由决策

```
登录成功
  └─ GET /api/orgs  （获取我加入的组织列表）
       ├─ 无组织
       │    └─ identity-selection（选择 Administrator / Member）
       │         ├─ Administrator → createOrgStep1 → 创建成功 → B端 /orgs/dashboard
       │         └─ Member → joinOrg → 加入成功 → [检查 metaPub]
       │
       └─ 有组织
            ├─ 包含管理员角色组织（Owner/Admin/Operator）
            │    └─ selectOrg（展示管理员组织列表 + "Enter as Employee" 按钮）
            │         ├─ 选择组织 → setCurrentOrg → B端 /orgs/dashboard
            │         ├─ "Enter as Employee" → [检查 metaPub]
            │         └─ "Create New Organization" → createOrgStep1
            │
            └─ 全部为 Employee 角色
                 └─ [检查 metaPub]
```

### metaPub 检查（C端入口必经步骤）

```
GET /api/auth/meta-pub
  ├─ submitted: true  → /employee/dashboard
  └─ submitted: false → bindWallet（连接钱包 + 生成并提交 metaKey）→ /employee/dashboard
```

- B端路径（创建组织 / 选择管理员组织）**不需要** metaPub 检查，直接进入 `/orgs/dashboard`。

### 布局守卫

| 守卫 | 位置 | 逻辑 |
| --- | --- | --- |
| `AuthChecker` | 两端 Layout | token 不存在 → 跳转 `/account/login` |
| `OrgGuard` | `OrgLayout` | `currentOrgId` 不存在 → 跳转 `/account/login` |
| `EmployeeGuard` | `EmployeeLayout` | 调用 `GET /api/auth/meta-pub`，未提交 → 跳转登录并展示 bindWallet 步骤 |

当从 C端布局直接跳转登录时，Router state 携带 `{ step: 'bindWallet' }`，登录页初始渲染即展示 BindWallet 步骤。

---

## Stores

### `useAuthStore`（`src/stores/auth.ts`）

| 字段/方法 | 说明 |
| --- | --- |
| `metaPubSubmitted` | `null`=未知 / `true` / `false` |
| `checkMetaPub()` | 调用后端接口并更新状态 |
| `setMetaPubSubmitted(v)` | BindWallet 成功后立即更新 |
| `reset()` | 登出时清空 |

### `useOrganizationStore`（`src/stores/organization.ts`）

| 字段/方法 | 说明 |
| --- | --- |
| `organizations` | 当前用户所有组织列表 |
| `currentOrgId` | 当前选中的 B端组织 ID（持久化到 localStorage） |
| `currentMember` | 当前组织的成员信息 |
| `getOrganizations()` | 获取并缓存组织列表 |
| `setCurrentOrg(orgId, member)` | 选择组织（同步到 localStorage） |
| `reset()` | 登出时清空 |

---

## metaPub / StealthPay 说明

员工进入 C端前需完成一次性 metaKey 注册：

1. 连接钱包（Reown AppKit）
2. 用钱包对 `'PactPay MetaKey v1'` 签名，派生确定性 `metaPriv`
3. 用 `metaPriv` 计算 secp256k1 非压缩公钥 `metaPub`
4. 用钱包对 `metaPub` 再次签名，提交 `POST /api/auth/meta-pub`

此后 HR 发薪时，后端用 `metaPub` 进行 ECDH 计算，为每位员工生成唯一的隐匿收款地址（stealthAddress），员工凭 `metaPriv` 在本地恢复私钥并 claim。

---

## HR 发薪 Deposit 流程

HR 在交易列表页点击 **Deposit** 按钮后，前端全自动完成链上操作：

```
1. 连接钱包（MetaMask）
      ↓
2. 切换到目标链（若当前链不符则触发 wallet_switchEthereumChain）
      ↓
3. [ERC-20 only] 查询 allowance
   ├─ allowance ≥ totalAmount → 跳过 approve
   └─ allowance < totalAmount → 调用 token.approve(vaultAddress, totalAmount)
      ↓
4. 调用 vault.depositForPayroll(merkleRoot, tokenAddress, totalAmount)
   [原生币时附带 msg.value = totalAmount，跳过第3步]
      ↓
5. 等待交易上链确认（receipt.status === 'success'）
      ↓
6. PATCH /api/transaction/:orgId/batch/:batchId/confirm-deposit
   payload: { depositTxHash }
```

### 关键字段来源

| 字段 | 来源 |
| --- | --- |
| `merkleRoot` | 创建发薪计划时后端计算并持久化，前端直接读 `TransactionPlan.merkleRoot` |
| `tokenAddress` | `TransactionPlan.tokenAddress` |
| `totalAmount` | `TransactionPlan.items[].amount` 求和后 `parseUnits(sum, decimals)` |
| `decimals` | `chainAsset.decimals`（通过 `caipChainId + tokenAddress` 匹配） |
| `isNative` | `chainAsset.isNative`（native 跳过 approve，附 `msg.value`） |
| `vaultAddress` | `Chain.vaultAddress`（后端 `/api/chain-asset/chains` 返回，来自 Vault 表） |