import { AxiosInstance } from 'axios'

export interface TokenAmount {
  caipChainId: string
  tokenAddress: string
  amount: string
}

export interface DashboardStatistics {
  totalMembers: number
  totalPaid: TokenAmount[]
  yearToDate: TokenAmount[]
  thisMonth: TokenAmount[]
}

export interface ByTimeMonthlyStat {
  month: number
  totalPayoutVolume: string
  transactionCount: number
  uniqueMembers: number
  status: string
}

export interface ByTimeStatistic {
  caipChainId: string
  tokenAddress: string
  symbol: string
  decimals: number
  totalPayoutVolume: string
  avgMonthlyPayout: string
  avgPayoutPerMember: string
  monthlyStats: ByTimeMonthlyStat[]
}

export interface ByTimeStatisticsResponse {
  year: number
  statistics: ByTimeStatistic[]
}

export interface GetByTimeStatisticsParams {
  year: number
  caipChainId?: string
  tokenAddress?: string
}

export interface TransactionAnalyticsAmount {
  caipChainId: string
  tokenAddress: string
  symbol?: string
  decimals?: number
  amount: string
}

export interface TransactionAnalyticsNode {
  batchId: string
  transactionName: string
  analyticsDate: string
  memberCount: number
  amount: TransactionAnalyticsAmount | null
}

export interface ByTransactionStatisticsResponse {
  totalTransactions: number
  avgTransactionsPerMonth: number
  transactionNodes: TransactionAnalyticsNode[]
  recentTransactions: TransactionAnalyticsNode[]
}

export interface GetByTransactionStatisticsParams {
  periodMonths?: number
  caipChainId?: string
  tokenAddress?: string
}

export type MemberHistoryStatus = 'active' | 'left' | 'deleted'

export interface MemberHistoryTotalPayment {
  caipChainId: string
  tokenAddress: string
  amount: string
}

export interface MemberHistoryListItem {
  memberId: string
  showName: string | null
  email: string | null
  status: MemberHistoryStatus
  deletedAt: string | null
  joinDate: string | null
  totalPayments: MemberHistoryTotalPayment[]
  remark: string | null
}

export interface MemberHistoryListResponse {
  data: MemberHistoryListItem[]
  page: number
  pageSize: number
  total: number
}

export interface GetMemberHistoryParams {
  page?: number
  pageSize?: number
  status?: MemberHistoryStatus
  keyword?: string
}

export interface MemberHistoryDetailMember {
  memberId: string
  userId: string | null
  showName: string | null
  avatarUrl: string | null
  email: string | null
  status: MemberHistoryStatus
  memberStatus: 'active' | 'pending_activation' | 'pending_review'
  deletedAt: string | null
  createdAt: string
  updatedAt: string
  remark: string | null
}

export interface MemberHistoryPayoutItem {
  analyticsDate: string
  transactionName: string
  batchId: string
  transactionStatus: string
  amount: (TransactionAnalyticsAmount & {
    symbol?: string
    decimals?: number
  }) | null
}

export interface MemberHistoryActivityLogItem {
  eventType: string
  createdAt: string
  displayText: string
  payload: Record<string, unknown> | null
}

export interface MemberHistoryDetailResponse {
  member: MemberHistoryDetailMember
  payoutHistory: MemberHistoryPayoutItem[]
  activityLogs: MemberHistoryActivityLogItem[]
}

export class StatisticsApi {
  constructor(private readonly request: AxiosInstance) {}

  private get orgId(): string {
    return localStorage.getItem('organizationId') || ''
  }

  async getDashboardStatistics(): Promise<DashboardStatistics> {
    const res = await this.request.get<DashboardStatistics>(`/orgs/${this.orgId}/statistics/dashboard`)
    return res.data
  }

  async getByTimeStatistics(params: GetByTimeStatisticsParams): Promise<ByTimeStatisticsResponse> {
    const hasChain = Boolean(params.caipChainId)
    const hasToken = Boolean(params.tokenAddress)

    if (hasChain !== hasToken) {
      throw new Error('caipChainId and tokenAddress must be provided together')
    }

    const res = await this.request.get<ByTimeStatisticsResponse>(`/orgs/${this.orgId}/statistics/by-time`, {
      params,
    })
    return res.data
  }

  async getByTransactionStatistics(
    params: GetByTransactionStatisticsParams = {}
  ): Promise<ByTransactionStatisticsResponse> {
    const hasChain = Boolean(params.caipChainId)
    const hasToken = Boolean(params.tokenAddress)

    if (hasChain !== hasToken) {
      throw new Error('caipChainId and tokenAddress must be provided together')
    }

    const res = await this.request.get<ByTransactionStatisticsResponse>(`/orgs/${this.orgId}/statistics/by-transaction`, {
      params,
    })
    return res.data
  }

  async getMemberHistory(params: GetMemberHistoryParams = {}): Promise<MemberHistoryListResponse> {
    const { page = 1, pageSize = 20, ...rest } = params
    const res = await this.request.get<MemberHistoryListResponse>(`/orgs/${this.orgId}/statistics/member-history`, {
      params: { page, pageSize, ...rest },
    })
    return res.data
  }

  async getMemberHistoryDetail(memberId: string): Promise<MemberHistoryDetailResponse> {
    const res = await this.request.get<MemberHistoryDetailResponse>(
      `/orgs/${this.orgId}/statistics/member-history/${memberId}`
    )
    return res.data
  }
}
