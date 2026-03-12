import { AxiosInstance } from 'axios'

// ── StealthPay 相关接口 ─────────────────────────────────────────────────────

export interface StealthPayrollItem {
  id: string
  batchId: string
  memberId: string
  stealthAddress: string
  amount: string
  tokenAddress: string
  ephemeralPub: string
  proof: string[]
  leaf: string
  recipient: string | null
  fee: string | null
  status: 'pending' | 'submitted' | 'claimed' | 'failed'
  createdAt: string
  updatedAt: string
  member: {
    showName: string
    status: string
  }
  // batch-level fields for EIP-712 signing
  vaultAddress?: string
  caipChainId?: string
  merkleRoot?: string
}

export interface ConfirmDepositPayload {
  depositTxHash: string
}

export interface SubmitClaimPayload {
  payrollItemId: string
  recipient: string
  fee: string
  deadline: number
  signature: string
  proof: string[]
}

export interface SubmitMetaPubPayload {
  metaPub: string
}

// ── 原有接口（保留兼容性）──────────────────────────────────────────────────

export interface TransactionPlanMember {
  memberId: string
  amount: string
}

export interface CreateTransactionPlanPayload {
  payPeriod: string
  transactionName: string
  members: TransactionPlanMember[]
}

export interface TransactionItemMember {
  id: string
  orgId: string
  memberId: string
  userId: string
  showName: string | null
  avatarUrl: string | null
  status: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  lastPayment: string | null
}

export interface TransactionItem {
  amount: string
  member: TransactionItemMember
}

export interface TransactionPlan {
  id: string
  orgId: string
  caipChainId: string
  transactionName: string
  transactionType: string
  transactionStatus:
    | 'draft'
    | 'proposed'
    | 'confirming'
    | 'ready'
    | 'executing'
    | 'success'
    | 'failed'
  payPeriod: string
  merkleRoot?: string
  tokenAddress?: string
  ephemeralPub?: string
  depositTxHash: string | null
  createdBy: string
  createdAt: string
  deletedAt: string | null
  items: TransactionItem[]
}

export interface TransactionPlansResponse {
  data: TransactionPlan[]
  page: number
  pageSize: number
  total: number
}

export interface CreateTransactionPlanResponse {
  batchId: string
}

export interface PayrollBatch {
  id: string
  orgId: string
  paymentAccountId: string
  transactionId: string
  transactionName: string
  transactionType: 'stealth'
  transactionStatus: string
  merkleRoot?: string
  token?: string
  ephemeralPub?: string
  depositTxHash?: string
  payPeriod: string
  createdBy: string
  createdAt: string
  deletedAt: string | null
}


export class TransactionApi {
  constructor(private readonly request: AxiosInstance) {}

  private get orgId(): string {
    return localStorage.getItem('organizationId') || ''
  }

  // 交易计划列表查询
  async getTransactionPlans(page: number = 1, pageSize: number = 20) {
    const res = await this.request.get<TransactionPlansResponse>(`/transaction/${this.orgId}`, {
      params: { page, pageSize }
    })
    return res.data
  }

  // 获取单个交易计划详情
  async getTransactionPlanDetail(transaction_id: string) {
    const res = await this.request.get<TransactionPlan>(`/transaction/${this.orgId}/${transaction_id}`)
    return res.data
  }

  // 创建交易计划（StealthPay）
  async createTransactionPlan(plan: CreateTransactionPlanPayload) {
    const res = await this.request.post<CreateTransactionPlanResponse>(`/transaction/${this.orgId}/plan`, plan)
    return res.data
  }

  // 删除交易计划
  async deleteTransactionPlan(transaction_id: string) {
    const res = await this.request.delete<string>(`/transaction/${this.orgId}/batch/${transaction_id}`)
    return res.data
  }

  // HR 确认 deposit（StealthPay）
  async confirmDeposit(batchId: string, depositTxHash: string) {
    const res = await this.request.patch<{ success: boolean }>(
      `/transaction/${this.orgId}/batch/${batchId}/confirm-deposit`,
      { depositTxHash }
    )
    return res.data
  }

  // 员工查询自己的工资明细（StealthPay）
  async getMyPayrollItems() {
    const res = await this.request.get<StealthPayrollItem[]>(`/transaction/${this.orgId}/my-payroll-items`)
    return res.data
  }

  // 员工提交 claim（StealthPay）
  async submitClaim(data: SubmitClaimPayload) {
    const res = await this.request.post<{ success: boolean; relayerTxId: string }>(
      `/transaction/${this.orgId}/submit-claim`,
      data
    )
    return res.data
  }

  // 获取成员支付统计
  async getMemberPaymentStatistics(memberId: string) {
    const res = await this.request.get<{
      memberId: string
      statistics: { currency: string; totalReceived: string; paymentCount: number }[]
    }>(`/transaction/${this.orgId}/members/${memberId}/payment-statistics`)
    return res.data
  }
}
