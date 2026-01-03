import { AxiosInstance } from 'axios'

export interface InviteCode {
  id: string
  orgId: string
  code: string
  maxUses: number | null
  usedcount: number
  status: string
  expireAt: string
  createdBy: string
  createdAt: string
}

export interface MemberRole {
  id: string
  role: 'Admin' | 'Operator' | 'Member'
  createdAt: string
}

export interface ReceivingAccount {
  id: string
  type: string
  status: string
  config: {
    address: string
  }
  createdAt: string
  updatedAt: string
}

export interface PayoutIntent {
  id: string
  amount: string
  currency: string
  network: string
  createdAt: string
  updatedAt: string
}

export interface OrganizationMember {
  id: string
  orgId: string
  memberId: string
  userId: string | null
  showName: string
  avatarUrl: string | null
  status: 'active' | 'pending' | 'inactive'
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  lastPayment: string | null
  roles: MemberRole[]
  payoutIntent: PayoutIntent | null
  receivingAccounts: ReceivingAccount[]
}

export interface MembersResponse {
  data: OrganizationMember[]
  total: number
  pageSize: number
  page: number
}

export interface EmailInvitationResponse {
  invite: InviteCode
  member: OrganizationMember
  inviteLog: {
    id: string
    orgId: string
    userId: string
    memberId: string
    code: string
    result: string
    createdAt: string
  }
}

export interface SafeWalletAccount {
  nonce: number
  owners: string[]
  address: string
  network: string
  version: string
  threshold: number
}

export interface PaymentAccount {
  orgId: string
  type: 'safe'
  config: SafeWalletAccount
}

export interface Organization {
  orgId: string
  orgName: string
  description?: string
  createdAt?: string
  updatedAt?: string
  getOrganizations: Organization[]
  paymentAccounts: PaymentAccount[]
}
export interface BindSafeWalletPayload {
  address: string
  chainId: string
}

export class OrgnizationApi {
  constructor(private readonly request: AxiosInstance) {}

  // 统一获取 organizationId（作为 getter，更简洁）
  private get orgId(): string {
    const orgId = localStorage.getItem('organizationId')
    return orgId || ''
  }

  // 创建公司
  async createOrganization(data: { orgName: string; website?: string; desc?: string }) {
    const res = await this.request.post<Organization>('/orgs/create', data)
    return res.data
  }
  // 获取我加入的公司列表
  async getOrganizations() {
    const res = await this.request.get<{ organization: Organization; member: OrganizationMember }[]>('/orgs')
    return res.data
  }
  // 绑定支付账户
  async bindPaymentAccount(params: BindSafeWalletPayload) {
    const res = await this.request.post<Organization>(`/orgs/${this.orgId}/payment-account/bind`, params)
    return res.data
  }
  // 获取公司详情
  async getOrganizationDetail() {
    const res = await this.request.get<string>(`/orgs/${this.orgId}`)
    return res.data
  }
  // 获取公司成员列表
  async getOrganizationMembers(page: number = 1, pageSize: number = 20) {
    const res = await this.request.get<MembersResponse>(`/orgs/${this.orgId}/members`, {
      params: { page, pageSize }
    })
    return res.data
  }
  // 获取当前公司的邀请码
  async getOrganizationInviteCode() {
    const res = await this.request.get<InviteCode>(`/orgs/${this.orgId}/invite-code`)
    return res.data
  }
  // 重新生成邀请码
  async regenerateOrganizationInviteCode() {
    const res = await this.request.post<InviteCode>(`/orgs/${this.orgId}/invite-code`)
    return res.data
  }
  // 发送邮箱邀请
  async sendEmailInvitation(email: string) {
    const res = await this.request.post<EmailInvitationResponse>(`/orgs/${this.orgId}/invites`, { email })
    return res.data
  }
  // 更新成员的收款账户地址
  async updateMemberAccountAddress(memberId: string, address: string) {
    const res = await this.request.patch<string>(`/orgs/${this.orgId}/members/${memberId}/wallet`, {
      address
    })
    return res.data
  }
  // 更新成员的支付意向
  async updateMemberPayoutIntent(memberId: string, amount: string, network: string) {
    const res = await this.request.patch<PayoutIntent>(`/orgs/${this.orgId}/members/${memberId}/payout-intent`, {
      amount,
      network
    })
    return res.data
  }
  // 删除成员
  async deleteMember(memberId: string) {
    const res = await this.request.delete<string>(`/orgs/${this.orgId}/members/${memberId}`)
    return res.data
  }

  // 更新成员信息(修改收款账户地址、支付意向、角色，接口待开发)
}
