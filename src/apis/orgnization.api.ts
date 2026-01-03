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
  address: string
  network: string
  createdAt: string
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

export interface Organization {
  id: string
  name: string
  description?: string
  createdAt?: string
  updatedAt?: string
}

export class OrgnizationApi {
  constructor(private readonly request: AxiosInstance) {}

  // 创建公司
  async createOrganization(name: string, description: string) {
    const res = await this.request.post<string>('/orgs/create', { name, description })
    return res.data
  }
  // 获取我的公司
  async getMyOrganizations() {
    const res = await this.request.get<Organization[]>('/orgs')
    return res.data
  }
  // 获取公司详情
  async getOrganizationDetail(organizationId: string) {
    const res = await this.request.get<string>(`/orgs/${organizationId}`)
    return res.data
  }
  // 获取公司成员列表
  async getOrganizationMembers(organizationId: string, page: number = 1, pageSize: number = 20) {
    const res = await this.request.get<MembersResponse>(`/orgs/${organizationId}/members`, {
      params: { page, pageSize }
    })
    return res.data
  }
  // 获取当前公司的邀请码
  async getOrganizationInviteCode(organizationId: string) {
    const res = await this.request.get<InviteCode>(`/orgs/${organizationId}/invite-code`)
    return res.data
  }
  // 重新生成邀请码
  async regenerateOrganizationInviteCode(organizationId: string) {
    const res = await this.request.post<InviteCode>(`/orgs/${organizationId}/invite-code`)
    return res.data
  }
  // 发送邮箱邀请
  async sendEmailInvitation(organizationId: string, email: string) {
    const res = await this.request.post<EmailInvitationResponse>(`/orgs/${organizationId}/invite-code`, { email })
    return res.data
  }
  // 更新成员的收款账户地址
  async updateMemberAccountAddress(organizationId: string, memberId: string, address: string, network: string) {
    const res = await this.request.post<string>(`/orgs/${organizationId}/members/${memberId}/receiving-account`, {
      address,
      network
    })
    return res.data
  }
  // 更新成员的支付意向
  async updateMemberPayoutIntent(organizationId: string, memberId: string, amount: string, network: string) {
    const res = await this.request.patch<PayoutIntent>(`/orgs/${organizationId}/members/${memberId}/payout-intent`, {
      amount,
      network
    })
    return res.data
  }
  // 删除成员
  async deleteMember(organizationId: string, memberId: string) {
    const res = await this.request.delete<string>(`/orgs/${organizationId}/members/${memberId}`)
    return res.data
  }
}
