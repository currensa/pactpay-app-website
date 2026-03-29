import { AxiosInstance } from 'axios'
import { MemberRole } from './orgnization.api'

// ── StealthPay 相关接口 ─────────────────────────────────────────────────────

export interface StealthPayrollItem {
  id: string
  batchId: string
  memberId: string
  stealthAddress: string
  amount: string
  tokenAddress: string
  proof: string[]
  leaf: string
  recipient: string | null
  fee: string | null
  status: 'pending' | 'submitted' | 'claimed' | 'failed'
  txHash: string | null
  createdAt: string
  updatedAt: string
  organizationName: string | null
  transactionName: string | null
  member?: {
    showName: string
    status: string
  }
  batch: {
    id: string
    caipChainId: string
    ephemeralPub: string
    merkleRoot: string
    tokenAddress: string
    transactionStatus: string
    depositTxHash: string | null
    payPeriod: string
  }
}


export interface BatchClaimItem {
  payrollItemId: string
  recipient: string
  deadline: number
  signature: string
}

export interface BatchClaimPayload {
  items: BatchClaimItem[]
}

export interface BatchClaimResponse {
  succeeded: { payrollItemId: string; txUrl: string; transactionName: string }[]
  failed: { payrollItemId: string; reason: string }[]
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
  roles: MemberRole[]
  email: string
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
  id:string
  status:string
  txHash:string
  member: TransactionItemMember
}

export interface TransactionPlan {
  id: string
  orgId: string
  caipChainId: string
  transactionName: string
  transactionType: string
  /** 所有 item（含服务费）金额之和，token 最小单位字符串 */
  totalAmount: string
  transactionStatus: string
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

export interface TransactionListItem {
  id: string
  orgId: string
  caipChainId: string
  transactionId?: string
  transactionName?: string
  transactionType: string
  transactionStatus: string
  payPeriod: string
  merkleRoot?: string
  tokenAddress?: string
  ephemeralPub?: string
  depositTxHash: string | null
  createdBy: string
  createdAt: string
  deletedAt?: string | null
  items: TransactionItem[]
  totalAmount: string
}

export interface TransactionListResponse {
  data: TransactionListItem[]
  page: number
  pageSize: number
  total: number
}


export class TransactionApi {
  constructor(private readonly request: AxiosInstance) {}

  private get orgId(): string {
    return localStorage.getItem('organizationId') || ''
  }

  // 交易计划列表查询
  async getTransactionPlans(page: number = 1, pageSize: number = 20, transactionStatus?: string) {
    const res = await this.request.get<TransactionPlansResponse>(`/transaction/${this.orgId}`, {
      params: { page, pageSize, ...(transactionStatus && transactionStatus !== 'all' ? { transactionStatus } : {}) }
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

  // 获取 deposit 授权签名（depositAuthorizer 的 EIP-712 签名，HR 执行存款前调用）
  async getDepositAuth(batchId: string) {
    const res = await this.request.get<{ authSignature: string; claimTime: number }>(
      `/transaction/${this.orgId}/batches/${batchId}/deposit-auth`,
    )
    return res.data
  }

  // 删除交易计划
  async deleteTransactionPlan(transaction_id: string) {
    const res = await this.request.delete<string>(`/transaction/${this.orgId}/batch/${transaction_id}`)
    return res.data
  }

  // 员工查询自己的工资明细（StealthPay，跨所有组织）
  async getMyPayrollItems(params: {
    status?: 'pending' | 'submitted' | 'claimed' | 'failed'
    page?: number
    pageSize?: number
    walletToken?: string
    caipChainId?: string
    tokenAddress?: string
  } = {}) {
    const res = await this.request.get<{ data: StealthPayrollItem[]; total: number }>(
      `/transaction/my-payroll-items`,
      { params }
    )
    return res.data
  }

  // 员工批量提交 claim（StealthPay，proof 由后端从 DB 获取）
  async batchClaim(data: BatchClaimPayload) {
    const res = await this.request.post<BatchClaimResponse>(`/transaction/claims/batch`, data)
    return res.data
  }

  // 获取成员支付统计
  async getMemberPaymentStatistics(memberId: string) {
    const res = await this.request.get<{
      memberId: string
      statistics: {
        tokenAddress: string
        caipChainId: string
        totalReceived: string
        paymentCount: number
        lastPayment: string | null
      }[]
    }>(`/transaction/${this.orgId}/members/${memberId}/payment-statistics`)
    return res.data
  }

  // 获取成员工资历史（跨组织）
  async getMemberPayrollHistory(orgId: string, memberId: string, params: { page?: number; pageSize?: number } = {}) {
    const res = await this.request.get<TransactionListResponse>(
      `/transaction/${orgId}/members/${memberId}/payroll-history`,
      { params }
    )
    return res.data
  }

    // 获取成员自己工资历史（跨组织）
    async getMyPayrollHistory(params: { orgId?: string; page?: number; pageSize?: number } = {}) {
      const res = await this.request.get<TransactionListResponse>(
        `/transaction/my-payroll-history`,
        { params }
      )
      return res.data
    }

  // 获取成员收入汇总（Dashboard 顶部三张卡片）
  async getMySummary() {
    const res = await this.request.get<{
      claimed: { tokenAddress: string; caipChainId: string; totalAmount: string }[]
      pendingClaim: { tokenAddress: string; caipChainId: string; totalAmount: string }[]
      incomeDistribution: { orgId: string; orgName: string; totalAmount: string; caipChainId: string; tokenAddress: string }[]
    }>('/transaction/my-summary')
    return res.data
  }

  // 预览服务费
  async getFeePreview(members: { memberId: string; amount: string }[]) {
    const res = await this.request.post<{
      billableMemberCount: number
      totalMemberCount: number
      plan: {
        id: string
        name: string
        pricePerMember: number
        originalPricePerMember: number
        description: string
      }
      originalFee: number
      discountedFee: number
    }>(`/transaction/${this.orgId}/plan/fee-preview`, members)
    return res.data
  }

  // 获取今日待执行交易列表
  async getReadyToExecuteTodayList(page: number = 1, pageSize: number = 20) {
    const today = new Date().toISOString().split('T')[0]
    const res = await this.request.get<TransactionListResponse>(`/transaction/${this.orgId}`, {
      params: { transactionStatus: 'ready', payPeriodStart: today, payPeriodEnd: today, page, pageSize }
    })
    return res.data
  }
}
