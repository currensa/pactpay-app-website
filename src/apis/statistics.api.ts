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
