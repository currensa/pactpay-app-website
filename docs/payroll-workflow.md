# 薪资单提案工作流程

## 🏗️ 架构设计原则

本系统采用**非托管架构**（Non-Custodial），这意味着：

- ✅ 后端**永不持有私钥**
- ✅ 前端只负责**签名操作**
- ✅ 后端负责交易创建、RPC 调用、状态追踪
- ✅ 所有与 Safe Transaction Service 的交互由后端完成

## 🔄 完整工作流程

### 1. 创建薪资单草稿

**前端操作**：

```typescript
POST /api/enterprise/payrolls/draft
{
  "safeWalletId": "uuid",
  "title": "2025-10 Monthly Payroll",
  "type": "MONTHLY",
  "employeeIds": ["employee-uuid-1", "employee-uuid-2"],

  // 可选：自定义每个员工的发薪金额（覆盖默认值）
  "paymentRecords": [
    {
      "employeeId": "employee-uuid-1",
      "amount": "3000000000000000000000",  // 自定义金额
      "tokenAddress": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"  // USDC
    },
    {
      "employeeId": "employee-uuid-2",
      "amount": "5000000000000000000000",
      "tokenAddress": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
    }
  ]
}
```

**说明**：

- 如果**提供** `paymentRecords`：使用自定义金额
- 如果**不提供** `paymentRecords`：使用员工的默认薪资和代币

**后端响应**：

```json
{
  "id": "payroll-uuid",
  "title": "2025-10 Monthly Payroll",
  "status": "DRAFT",
  "type": "MONTHLY",
  "paymentRecords": [
    {
      "employeeId": "employee-uuid-1",
      "employeeName": "Alice",
      "recipientAddress": "0x...",
      "amount": "3000000000000000000000",
      "tokenAddress": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      "tokenSymbol": "USDC"
    },
    {
      "employeeId": "employee-uuid-2",
      "employeeName": "Bob",
      "recipientAddress": "0x...",
      "amount": "5000000000000000000000",
      "tokenAddress": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      "tokenSymbol": "USDC"
    }
  ],
  "totalAmount": {
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48": "8000000000000000000000"
  }
}
```

### 2. （可选）编辑薪资单

如果用户想修改金额，可以编辑薪资单：

**前端操作**：

```typescript
PATCH /api/enterprise/payrolls/{id}/draft
{
  "paymentRecords": [
    {
      "employeeId": "employee-uuid-1",
      "amount": "5000000000000000000000",
      "tokenAddress": "0xUSDC..."
    }
  ]
}
```

**前端 UI 建议**：

- 显示员工列表，每个员工有默认薪资
- 允许用户修改金额
- 支持选择不同的代币（USDC、USDT 等）
- 实时计算总金额

### 3. 创建 Safe 交易

**前端操作**：

```typescript
POST /api/enterprise/payrolls/{id}/create-transaction
{
  "walletAddress": "0x1234567890123456789012345678901234567890"  // 用于签名的钱包地址
}
```

**后端处理**：

- 验证 walletAddress 是 Safe 的 owner
- 使用 Safe SDK 创建完整的 Safe 交易
- 计算 safeTxHash
- 保存交易草稿到数据库

**后端响应**：

```json
{
  "payrollId": "payroll-uuid",
  "safeTxHash": "0x1234...",
  "safeAddress": "0x...",
  "chainId": 1,
  "threshold": 2,
  "nonce": 0,
  "transactionData": {
    "safeTransaction": {
      /* Safe SDK 创建的完整交易对象 */
    },
    "safeTxHash": "0x1234...",
    "safeAddress": "0x...",
    "chainId": 1,
    "threshold": 2,
    "nonce": 0
  }
}
```

### 4. 前端签名交易哈希

**前端代码示例**：

```typescript
import { ethers } from 'ethers';

// 创建交易（需要提供钱包地址）
const { safeTxHash, safeAddress, chainId, transactionData } = await fetch(
  `/api/enterprise/payrolls/${payrollId}/create-transaction`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      walletAddress: userWalletAddress, // 用户的钱包地址
    }),
  },
).then((r) => r.json());

// 使用钱包签名 safeTxHash
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
const signerAddress = await signer.getAddress();

// 签名 hash
const signature = await signer.signMessage(ethers.getBytes(safeTxHash));

// 提交签名到后端
const result = await fetch(`/api/enterprise/payrolls/${payrollId}/submit-signature`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    safeTxHash,
    signature,
    signerAddress,
    safeTransactionData: transactionData, // 使用后端返回的完整交易数据
  }),
}).then((r) => r.json());
```

### 5. 后端提交签名并提案交易

**前端操作**：

```typescript
POST /api/enterprise/payrolls/{id}/submit-signature
{
  "safeTxHash": "0x1234...",
  "signature": "0xabcd...",
  "signerAddress": "0x..."
}
```

**后端处理**：

- 验证签名有效性
- 调用 Safe Transaction Service API 提案交易
- 记录交易状态到数据库
- 更新薪资单状态为 PROPOSED

**后端响应**：

```json
{
  "id": "payroll-uuid",
  "status": "PROPOSED",
  "transaction": {
    "safeTxHash": "0x1234...",
    "nonce": 0,
    "confirmations": 1,
    "confirmationsRequired": 2,
    "safeAppUrl": "https://app.safe.global/transactions/tx?safe=eth:0x...&id=multisig_0x..."
  }
}
```

### 6. 其他签名者在 Safe App 中签名

**前端操作**：

用户可以通过 `safeAppUrl` 访问 Safe App 进行签名：

```typescript
// 打开 Safe App 链接
window.open(result.transaction.safeAppUrl, '_blank');
```

**在 Safe App 中**：

- 其他 Safe owners 依次签名
- 达到阈值（例如 2/3）后，交易状态变为 `EXECUTABLE`

### 7. 在 Safe App 中执行交易 ⭐

**重要说明**：

- ✅ 当交易状态为 `EXECUTABLE` 时，任何 Safe owner 可以执行交易
- 💰 **执行者需要从个人钱包支付 gas 费**（约 $5-20 on Ethereum, $0.01-0.1 on Polygon）
- ❌ Gas 费**不从** Safe 钱包扣除
- ❌ Gas 费**不从**员工薪资扣除

**执行步骤**：

1. 在 Safe App 中，点击 "Execute" 按钮
2. 连接执行者的个人钱包（MetaMask 等）
3. 确认并支付 gas 费
4. 交易上链
5. 状态变为 `EXECUTED`

**建议**：

- 公司应设立 gas 费报销政策
- 可以指定专人负责执行交易
- 执行前确保个人钱包有足够的原生代币（ETH/MATIC）

### 8. 后端自动监控交易状态

后端有一个定时任务（每30秒）自动同步交易状态：

- 从 Safe Transaction Service API 获取最新状态
- 更新数据库中的交易记录
- 更新薪资单状态（`EXECUTABLE` → `EXECUTED`）

## 📊 状态流转

```
DRAFT → PROPOSED → AWAITING_SIGNATURES → EXECUTABLE → EXECUTED
  ↓                                                        ↓
CANCELLED                                              FAILED
```

## 🔍 监控交易

### 查看交易详情

```typescript
GET / api / enterprise / transactions / { id };
```

**响应**：

```json
{
  "id": "transaction-uuid",
  "safeTxHash": "0x1234...",
  "status": "EXECUTABLE", // 或 EXECUTED
  "confirmations": 2,
  "confirmationsRequired": 2,
  "safeAppUrl": "https://app.safe.global/...",
  "nonce": 0
}
```

### 手动同步交易状态

```typescript
POST / api / enterprise / transactions / { id } / sync;
```

**说明**：强制从 Safe Transaction Service 同步最新状态

## 🎯 关键API端点

### 薪资单相关

- `POST /api/enterprise/payrolls/draft` - 创建草稿
- `PATCH /api/enterprise/payrolls/{id}/draft` - 更新草稿
- `POST /api/enterprise/payrolls/{id}/create-transaction` - 创建 Safe 交易（需要提供 walletAddress） ⭐ **新**
- `POST /api/enterprise/payrolls/{id}/submit-signature` - 提交签名并提案 ⭐ **新**

### 交易相关

- `GET /api/enterprise/transactions` - 查询交易列表
- `GET /api/enterprise/transactions/{id}` - 查询交易详情
- `POST /api/enterprise/transactions/{id}/sync` - 同步交易状态

## ⚠️ 重要说明

### 1. 职责分离

- ✅ 后端负责创建交易、RPC 调用、状态同步
- ✅ 前端只负责签名操作（不持有私钥）
- ✅ 所有与 Safe Transaction Service 的交互由后端完成

### 2. Gas 费用 💰

**谁支付 Gas 费？**

- ✅ **提案和签名阶段**：完全免费（链下操作）
- 💰 **执行阶段**：执行者从个人钱包支付 gas 费

**Gas 费金额**：

- Ethereum 主网：约 $5-20（取决于网络拥堵）
- Polygon：约 $0.01-0.1
- 其他链：根据网络而定

**重要提醒**：

- ❌ Gas 费**不从** Safe 钱包扣除
- ❌ Gas 费**不从**员工薪资扣除
- ✅ 只从执行者的个人钱包扣除
- 💡 建议公司设立 gas 费报销政策

### 3. 签名流程

- 后端使用 Safe SDK 创建交易并计算 safeTxHash
- 前端用户钱包签名 safeTxHash（EIP-712 或 eth_sign）
- 后端接收签名后提交到 Safe Transaction Service

### 4. 使用正确的 token 地址

- 批量交易中，每个交易的 `to` 字段是 **ERC20 token 合约地址**
- `data` 字段包含编码的 `transfer(address,uint256)` 调用

### 5. 处理多签流程

- **步骤 1**：第一个签名者通过前端提交签名，后端提案交易
- **步骤 2**：其他签名者在 Safe App 中签名
- **步骤 3**：达到阈值后，状态变为 `EXECUTABLE`
- **步骤 4**：任何 Safe owner 在 Safe App 中执行交易（支付 gas 费）
- **步骤 5**：交易上链，状态变为 `EXECUTED`

### 6. 错误处理

- 如果创建交易失败，薪资单保持 `DRAFT` 状态
- 如果签名提交失败，可重新提交签名
- 如果执行失败，状态变为 `FAILED`
- 用户可以随时取消草稿状态的薪资单

### 7. 前端 UX 建议

- 在提案成功后，显示签名进度（1/2, 2/2）
- 当状态变为 `EXECUTABLE` 时，明确提示用户需要在 Safe App 执行
- 提醒执行者需要支付 gas 费
- 提供 Safe App 链接的快捷打开方式
- 实时显示交易状态更新

## 📚 相关文档

- [Safe Core SDK Documentation](https://docs.safe.global/safe-core-aa-sdk/protocol-kit)
- [Safe Transaction Service API](https://docs.safe.global/safe-core-api/api-overview)
- [EIP-4361: Sign-In with Ethereum](https://eips.ethereum.org/EIPS/eip-4361)

## 🎬 完整示例：从创建到执行

```typescript
// ========== 1. 创建薪资单草稿 ==========
const payroll = await fetch('/api/enterprise/payrolls/draft', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    safeWalletId: 'safe-wallet-uuid',
    title: '2025-10 Monthly Payroll',
    type: 'MONTHLY',
    employeeIds: ['emp1', 'emp2'],
    // 可选：自定义金额
    paymentRecords: [
      { employeeId: 'emp1', amount: '3000000000', tokenAddress: '0xUSDC...' },
      { employeeId: 'emp2', amount: '5000000000', tokenAddress: '0xUSDC...' },
    ],
  }),
}).then((r) => r.json());

console.log('薪资单创建成功:', payroll.id);

// ========== 2. 创建 Safe 交易 ==========
const txData = await fetch(`/api/enterprise/payrolls/${payroll.id}/create-transaction`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
}).then((r) => r.json());

console.log('Safe 交易已创建，safeTxHash:', txData.safeTxHash);

// ========== 3. 用户签名 ==========
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
const signature = await signer.signMessage(ethers.getBytes(txData.safeTxHash));

console.log('用户已签名');

// ========== 4. 提交签名到后端 ==========
const result = await fetch(`/api/enterprise/payrolls/${payroll.id}/submit-signature`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    safeTxHash: txData.safeTxHash,
    signature,
    signerAddress: await signer.getAddress(),
  }),
}).then((r) => r.json());

console.log('交易已提案到 Safe');
console.log(
  `当前签名: ${result.transaction.confirmations}/${result.transaction.confirmationsRequired}`,
);

// ========== 5. 引导用户到 Safe App ==========
if (result.transaction.confirmations < result.transaction.confirmationsRequired) {
  alert('交易已提案！请其他 Safe owners 在 Safe App 中签名');
} else {
  alert('签名已收集完成！请在 Safe App 中执行交易（执行者需要支付 gas 费）');
}

// 打开 Safe App
window.open(result.transaction.safeAppUrl, '_blank');

// ========== 6. 监听交易状态 ==========
const checkStatus = setInterval(async () => {
  const tx = await fetch(`/api/enterprise/transactions/${result.transaction.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());

  console.log('交易状态:', tx.status);

  if (tx.status === 'EXECUTABLE') {
    alert('交易可执行！请在 Safe App 中点击 Execute（需支付 gas 费）');
  } else if (tx.status === 'EXECUTED') {
    clearInterval(checkStatus);
    alert('🎉 薪资发放成功！');
  } else if (tx.status === 'FAILED') {
    clearInterval(checkStatus);
    alert('❌ 交易执行失败');
  }
}, 5000); // 每5秒检查一次
```
