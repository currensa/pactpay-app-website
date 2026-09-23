import { PayrollItemStatus, PayrollTransactionStatus } from '@/enums/transaction'
import { AxiosInstance } from 'axios'
import { MemberRole } from './orgnization.api'

export const TRANSACTION_LIST_TRANSACTION_TYPES = ['privacy_deposit', 'token_usage_plan', 'all'] as const
export type TransactionListTransactionType = typeof TRANSACTION_LIST_TRANSACTION_TYPES[number]

// ── GravArc payroll items ───────────────────────────────────────────────────

/**
 * privacy_deposit 明细的提款数据。
 * 仅当 transactionType === 'privacy_deposit' 且未提款时由后端返回，否则为 null。
 */
export interface PrivacyWithdrawData {
  caipChainId: string
  /** GravArc 主合约地址（前端调用 withdraw 的目标合约） */
  gravArcAddress: string
  /** 本批存款在全局 Merkle 树中的叶子索引 */
  leafIndex: number | null
  /** 树层级 8 / 16 / 32 / 64 / 128（用于选择对应 withdraw 电路） */
  tier: number | null
  /** 存款叶子 depositLeaf（= Poseidon(authRoot, depositorSecretHash)），存款确认后由后端写入 */
  privacyDepositLeaf: string | null
  /** 加密的提款消息（NaCl box，前端用本人私钥解密后得到 WithdrawInfo JSON） */
  content: string | null
  /** 本人 Secret 密文（NaCl secretbox，前端用密码解密恢复 Secret） */
  encryptedSecret: string | null
  /** 本人 Secret 的 Poseidon 哈希值（0x 前缀 hex，用于核验） */
  secretHash: string | null
}

export interface PrivacyPayrollItem {
  id: string
  batchId: string
  memberId: string
  amount: string
  /** 平台服务费（token 最小单位字符串），由后端计算后附在 item 上 */
  platformFee?: string | null
  tokenAddress: string
  recipient: string | null
  fee: string | null
  status: PayrollItemStatus
  txHash: string | null
  createdAt: string
  updatedAt: string
  organizationName: string | null
  transactionName: string | null
  /** Transaction type: privacy_deposit | token_usage_plan */
  transactionType: string
  /** privacy_deposit 类型且可提款时返回；其它类型为 null */
  withdrawData: PrivacyWithdrawData | null
  member?: {
    showName: string
    status: string
  }
  batch: {
    id: string
    caipChainId: string
    tokenAddress: string
    transactionStatus: string
    depositTxHash: string | null
    payPeriod: string
  }
}


export interface WithdrawalBatchResult {
  succeeded: { payrollItemId: string; txUrl: string; transactionName: string }[]
  failed: { payrollItemId: string; reason: string }[]
}

/**
 * 把 privacy_deposit 提款交给平台代执行时上送的 withdraw 证明参数。
 * 数值字段统一为十进制字符串，结构与链上 withdraw tuple 一致。
 */
export interface RelayWithdrawArgs {
  pA: [string, string]
  pB: [[string, string], [string, string]]
  pC: [string, string]
  nullifierHash: string
  recipient: string
  claimedAmount: string
  token: string
  tier: number
  depositRoot: string
  expectedAmount: string
  fee: string
  relayer: string
  nonce: string
}

export interface RelayWithdrawResponse {
  status: string
  txHash: string
  recipient: string | null
  fee: string | null
}

/** GravArc 隐私退款上送参数（与合约 RefundParams 一一对应）。 */
export interface RelayGravArcRefundArgs {
  pA: [string, string]
  pB: [[string, string], [string, string]]
  pC: [string, string]
  depositRoot: string
  nullifierHash: string[]
  token: string
  refundAmount: string
  fee: string
  relayer: string
  refunder: string
  tier: number
}

export interface RelayGravArcRefundResponse {
  status: string
  txHash: string
}

// ── 原有接口（保留兼容性）──────────────────────────────────────────────────

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
  remark: string | null
}

export interface TransactionItem {
  amount: string | null
  /** 平台服务费（token 最小单位字符串），由后端计算后附在 item 上 */
  platformFee?: string | null
  id:string
  recipient: string | null
  createdAt: string
  updatedAt: string
  status:PayrollItemStatus
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
  totalAmount: string | null
  transactionStatus: PayrollTransactionStatus
  payPeriod: string
  merkleRoot?: string
  tokenAddress?: string
  ephemeralPub?: string
  depositTxHash: string | null
  createdBy: string
  createdAt: string
  deletedAt: string | null
  tokenUsagePlanId: string | null
  /** GravArc 隐私存款树层级；privacy_deposit 与 GravArc 充值批次（token_usage_plan）均带此字段 */
  privacyTier?: number | null
  /** GravArc 本批存款叶子索引 */
  privacyLeafIndex?: number | null
  /** GravArc 存款叶子 depositLeaf */
  privacyDepositLeaf?: string | null
  /** GravArc 是否支持存款人退款 */
  privacyRefundable?: boolean | null
  items: TransactionItem[]
}

export interface TransactionPlansResponse {
  data: TransactionPlan[]
  page: number
  pageSize: number
  total: number
}

export type PrivacyDepositTier = 8 | 16 | 32 | 64 | 128

export interface CreatePrivacyDepositPlanMember {
  memberId: string
}

export interface CreatePrivacyDepositPlanPayload {
  caipChainId: string
  tokenAddress: string
  transactionName?: string
  payPeriod?: string
  members: CreatePrivacyDepositPlanMember[]
  encryptedPlan: string
}

export interface CreatePrivacyDepositPlanResponseMember {
  address: string
  secretHash: string
  encPubkey: string
}

export interface CreatePrivacyDepositPlanResponseDto {
  batchId: string
  tier: PrivacyDepositTier
  caipChainId: string
  tokenAddress: string
  members: CreatePrivacyDepositPlanResponseMember[]
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
  totalAmount: string | null
}

export interface TransactionListResponse {
  data: TransactionListItem[]
  page: number
  pageSize: number
  total: number
}


export interface CircuitFilesResponse {
  wasmUrl: string
  zkeyUrl: string
  wasmSha256?: string
  zkeySha256?: string
}

export interface DepositPathResponse {
  nextIndex: number
  siblings: string[]
  pathIndices: number[]
}

export interface PrivacyDepositMemberData {
  memberId: string
  address: string
  secretHash: string
  encPubkey: string
  /** Present only for system recharge, never for private payroll. */
  amount?: string
  /** 本成员应到账金额（net，token 最小单位字符串），不含服务费 */
  /**
   * 本成员服务费（token 最小单位字符串）。前端存款时把它加到 amount 上，按 gross
   * (amount + platformFee) 承诺进 deposit 树；提款时合约再扣掉同样的 platformFee 给
   * relayer，成员最终到账正好为 amount。必须与 item.platformFee 一致。
   */
  platformFee?: string | null
}

export interface PrivacyDepositDataResponse {
  tier: number
  privacyDepositLeaf: string | null
  privacyRefundable: boolean | null
  encryptedPlan: string | null
  totalAmount: string | null
  members: PrivacyDepositMemberData[]
}

export interface WithdrawMessage {
  clientMessageId: string
  address: string
  content: string
  secretHash: string
  encPubkey: string
}

export interface ConfirmPrivacyDepositPayload {
  depositTxHash: string
  withdrawMessages: WithdrawMessage[]
}

export class TransactionApi {
  constructor(private readonly request: AxiosInstance) {}

  private get orgId(): string {
    return localStorage.getItem('organizationId') || ''
  }

  // 交易计划列表查询
  async getTransactionPlans(
    page: number = 1,
    pageSize: number = 20,
    transactionStatus?: string,
    transactionName?: string,
    transactionType: TransactionListTransactionType = 'privacy_deposit',
  ) {
    const res = await this.request.get<TransactionPlansResponse>(`/transaction/${this.orgId}`, {
      params: {
        page,
        pageSize,
        transactionType,
        ...(transactionStatus && transactionStatus !== 'all' ? { transactionStatus } : {}),
        ...(transactionName ? { transactionName } : {}),
      }
    })
    return res.data
  }

  // 获取单个交易计划详情
  async getTransactionPlanDetail(transaction_id: string) {
    const res = await this.request.get<TransactionPlan>(`/transaction/${this.orgId}/${transaction_id}`)
    return res.data
  }

  // 创建隐私存款计划草稿
  async createPrivacyDepositPlan(payload: CreatePrivacyDepositPlanPayload) {
    const res = await this.request.post<CreatePrivacyDepositPlanResponseDto>(
      `/transaction/${this.orgId}/privacy-deposit-plan`,
      payload,
    )
    return res.data
  }

  async confirmDeposit(batchId: string, depositTxHash: string) {
    const res = await this.request.post<{ success: boolean }>(
      `/transaction/${this.orgId}/batches/${batchId}/confirm-deposit`,
      { depositTxHash },
    )
    return res.data
  }

  // 删除交易计划
  async deleteTransactionPlan(transaction_id: string) {
    const res = await this.request.delete<string>(`/transaction/${this.orgId}/batch/${transaction_id}`)
    return res.data
  }

  // Query the current user's GravArc payroll items across organizations.
  async getMyPayrollItems(params: {
    status?: 'claimed' | 'claimable'
    page?: number
    pageSize?: number
    caipChainId?: string
    tokenAddress?: string
  } = {}) {
    const res = await this.request.get<{ data: PrivacyPayrollItem[]; total: number }>(
      `/transaction/my-payroll-items`,
      { params }
    )
    return res.data
  }

  // privacy_deposit 明细提款成功后回调（登录态，不需要 orgId；后端按 txHash 做链上回执校验）
  async confirmPrivacyWithdraw(itemId: string, txHash: string) {
    const res = await this.request.post<{
      status: string
      txHash: string
      recipient: string | null
      fee: string | null
    }>(`/transaction/my-payroll-items/${itemId}/confirm-withdraw`, { txHash })
    return res.data
  }

  // 获取平台 relayer 地址 + 该链是否支持 relayer 代付（withdraw + refund 共用，链级配置约束委托/直发）
  async getPrivacyWithdrawRelayer(caipChainId?: string) {
    const res = await this.request.get<{ relayerAddress: string; withdrawRelayerSupported: boolean; refundRelayerSupported: boolean }>(
      '/transaction/privacy-withdraw-relayer',
      { params: caipChainId ? { caipChainId } : undefined },
    )
    return res.data
  }

  // 把 privacy_deposit 提款交给平台代执行（节省 gas），后端用 relayer 钱包代付 gas 上链
  async relayPrivacyWithdraw(itemId: string, args: RelayWithdrawArgs) {
    const res = await this.request.post<RelayWithdrawResponse>(
      `/transaction/my-payroll-items/${itemId}/relay-withdraw`,
      args,
    )
    return res.data
  }

  // GravArc 隐私退款：前端生成 refund 证明后交平台 relayer 代执行（合约要求 msg.sender == relayer）
  async relayGravArcRefund(batchId: string, args: RelayGravArcRefundArgs) {
    const res = await this.request.post<RelayGravArcRefundResponse>(
      `/transaction/${this.orgId}/batches/${batchId}/relay-refund`,
      args,
    )
    return res.data
  }

  // GravArc 隐私退款 txHash 确认
  async confirmGravArcRefund(batchId: string, refundTxHash: string) {
    const res = await this.request.post<{ success: boolean }>(
      `/transaction/${this.orgId}/batches/${batchId}/confirm-refund-gravarc`,
      { depositTxHash: refundTxHash },
    )
    return res.data
  }

  // 读取可退款存款的加密退款载荷（便携化：存款人在任意设备登录后取回 encContent 解密）
  async getRefundPayload(batchId: string) {
    const res = await this.request.get<{ encContent: string | null; depositInfo: string | null }>(
      `/transaction/${this.orgId}/batches/${batchId}/refund-payload`,
    )
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
  async getFeePreview(members: { memberId: string }[]) {
    const res = await this.request.post<{
      caipChainId: string
      token: string
      summary: {
        billableMemberCount: number
        totalMemberCount: number
        originalUnitPrice: string
        finalUnitPrice: string
        originalFee: string
        finalFee: string
        appliedDiscountCount: number
        unitDiscountAmount: string
        totalDiscountAmount: string
      }
      pricingDisplay: {
        billableMemberCount: number
        originalUnitPrice: string
        originalUnitSubtotal: string
        finalUnitPrice: string
        finalUnitSubtotal: string
      }
      matchedRules: {
        ruleCode: string
        name: string
        description: string
        ruleType: string
        targetType: string
        targetValue: string | null
        pricePerMember: string | null
        discountRateBps: number | null
        discountLabel: string | null
        beforeUnitPrice: string | null
        effectiveUnitPrice: string | null
        unitDiscountAmount: string | null
        beforeFee: string | null
        effectiveFee: string | null
        feeDiscountAmount: string | null
      }[]
      referralBenefit: {
        applied: boolean
        eligible: boolean
        state: string
        referralCode: string | null
        discountRateBps: number | null
      }
      gasFeeEstimate: {
        gasPrice: string | null
        maxFeePerGas: string | null
        maxPriorityFeePerGas: string | null
        effectiveGasPrice: string | null
        nativeSymbol: string | null
        nativeDecimals: number | null
        approve: { gasUnits: string; costWei: string; costNative: string } | null
        deposit: { gasUnits: string; costWei: string; costNative: string } | null
        total: { gasUnits: string; costWei: string; costNative: string } | null
      }
    }>(`/transaction/${this.orgId}/plan/fee-preview`, members)
    return res.data
  }

  // 获取 ZK 电路文件 CDN 链接
  async getCircuitFiles(caipChainId: string, tier: number, circuitType: 'deposit' | 'withdraw' | 'refund' = 'deposit') {
    const res = await this.request.get<CircuitFilesResponse>('/gravarc/circuit-files', {
      params: { caipChainId, tier, circuitType },
    })
    return res.data
  }

  // 获取 Merkle 沉积路径
  async getDepositPath(caipChainId: string) {
    const res = await this.request.get<DepositPathResponse>('/gravarc/deposit-path', {
      params: { caipChainId },
    })
    return res.data
  }

  // 获取已存在存款（leafIndex）相对当前 deposit 树根的成员证明（退款证明用）
  async getDepositMembershipPath(caipChainId: string, leafIndex: number) {
    const res = await this.request.get<{
      leafIndex: number
      depositRoot: string
      siblings: string[]
      pathIndices: number[]
    }>('/gravarc/deposit-membership-path', {
      params: { caipChainId, leafIndex },
    })
    return res.data
  }

  // 获取批次隐私存款数据（authRoot + 成员公钥）
  async getPrivacyDepositData(batchId: string) {
    const res = await this.request.get<PrivacyDepositDataResponse>(
      `/transaction/${this.orgId}/batches/${batchId}/privacy-deposit-data`,
    )
    return res.data
  }

  // 确认隐私存款（含 withdrawMessages）
  async confirmPrivacyDeposit(batchId: string, payload: ConfirmPrivacyDepositPayload) {
    const res = await this.request.post<{ success: boolean }>(
      `/transaction/${this.orgId}/batches/${batchId}/confirm-deposit`,
      payload,
    )
    return res.data
  }

  // 获取今日待执行交易列表
  async getReadyToExecuteTodayList(page: number = 1, pageSize: number = 20) {
    const now = new Date()
    const tzOffset = -now.getTimezoneOffset()
    const sign = tzOffset >= 0 ? '+' : '-'
    const pad = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, '0')
    const tzStr = `${sign}${pad(tzOffset / 60)}:${pad(tzOffset % 60)}`
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    const payPeriodStart = `${dateStr}T00:00:00${tzStr}`
    const payPeriodEnd = `${dateStr}T23:59:59${tzStr}`
    const res = await this.request.get<TransactionListResponse>(`/transaction/${this.orgId}`, {
      params: { transactionStatus: 'ready', payPeriodStart, payPeriodEnd, page, pageSize }
    })
    return res.data
  }
}
