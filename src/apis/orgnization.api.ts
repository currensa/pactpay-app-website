import { AxiosInstance } from 'axios'

export interface Organization {
  id: string
  orgName: string
  description: string
  createdAt: string
  updatedAt: string
}

interface Role {
  id: string
  role: string
  createdAt: string
}

interface WalletReceivingAccount {
  id: string
  type: 'wallet'
  config: {
    address: string
    chainId: string
  }
}

export interface OrganizationMember {
  id: string
  orgId: string
  memberId: string
  userId: string
  showName: string
  avatarUrl: string | null
  status: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  roles: Role[]
  receivingAccounts: WalletReceivingAccount[]
}

export interface BindSafeWalletPayload {
  address: string
  chainId: string
}

export class OrgnizationApi {
  constructor(private readonly request: AxiosInstance) {}

  async createOrganization(data: { orgName: string; website?: string; desc?: string }) {
    const res = await this.request.post<Organization>('/orgs/create', data)
    return res.data
  }

  async getOrganizations() {
    const res = await this.request.get<{ organization: Organization; member: OrganizationMember }[]>('/orgs')
    return res.data
  }

  async bindPaymentAccount(params: BindSafeWalletPayload) {
    const orgId = localStorage.getItem('organizationId')
    const res = await this.request.post<Organization>(`/orgs/${orgId}/payment-account/bind`, params)
    return res.data
  }
}
