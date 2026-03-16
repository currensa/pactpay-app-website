import { AxiosInstance } from 'axios'

export interface MemberStatistics {
  totalMembers: number
  newMembersThisMonth: number
}

export interface TransactionStatistics {
  totalReady: number
  readyToExecuteToday: number
}

export interface PaymentStatisticsByCurrency {
  currency: string
  caipChainId: string
  totalPaidThisMonth: string
  totalPaidLastMonth: string
  changePercentage: string
}

export interface PaymentStatistics {
  currencies: PaymentStatisticsByCurrency[]
}

export interface DashboardStatistics {
  memberStatistics: MemberStatistics
  transactionStatistics: TransactionStatistics
  paymentStatistics: PaymentStatistics
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
}
