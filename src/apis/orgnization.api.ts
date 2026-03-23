import { AxiosInstance } from 'axios'

export enum InviteLogStatus {
  INVITE_PENDING = 'InvitePending', // 管理员已邀请，用户尚未提交 metaPub
  PENDING = 'Pending',              // 用户主动申请，等待管理员审批
  APPROVE = 'Approve',
  REJECT = 'Reject',
}

export enum InviteLogSource {
  INVITE = 'invite', // 管理员发起邀请
  APPLY = 'apply',   // 用户主动申请
}

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
  role: 'Owner' | 'Admin' | 'Operator' | 'Member'
  createdAt: string
}

export interface PayoutIntent {
  id: string
  amount: string
  caipChainId: string
  token: string
  createdAt: string
  updatedAt: string
}

export interface OrganizationMember {
  id: string
  orgId: string
  memberId: string
  userId: string | null
  showName: string
  email: string | null
  avatarUrl: string | null
  status: 'active' | 'pending_activation' | 'pending_review'
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  lastPayment: string | null
  roles: MemberRole[]
  /** 成员可有多个支付意向（按 caipChainId+token 唯一），取当前组织发薪配置对应的那条 */
  payoutIntent: PayoutIntent
  metaPub: string | null
  inviteStatus: InviteLogStatus | null
}

export interface MembersResponse {
  data: OrganizationMember[]
  total: number
  pageSize: number
  page: number
}

export interface Asset {
  id: string
  symbol: string
  name: string
  iconUrl: string
  isStable: boolean
  status: string
  createdAt: string
  updatedAt: string
}

export interface Chain {
  id: string
  caipChainId: string
  name: string
  chainId: string
  ecosystem: string
  iconUrl: string
  rpcUrls: string[]
  explorerUrls: string[]
  status: string
  createdAt: string
  updatedAt: string
}

export interface AssetChain {
  id: string
  caipChainId: string
  assetId: string
  contractAddress: string
  decimals: number
  isNative: boolean
  status: string
  createdAt: string
  updatedAt: string
  asset: Asset
  chain: Chain
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
    status: InviteLogStatus
    source?: InviteLogSource
    createdAt: string
  }
}

export interface Organization {
  orgId: string
  orgName: string
  desc: string
  description?: string
  website?: string
  logoUrl?: string
  createdAt?: string
  updatedAt?: string
}

export interface OrgPayrollConfig {
  id: string
  orgId: string
  caipChainId: string
  token: string
  createdAt: string
  updatedAt: string
}

export interface ActivityLog {
  id: string
  eventType: string
  orgId: string
  memberId: string | null
  actorId: string | null
  payload: Record<string, unknown> | null
  createdAt: string
}

export interface ActivityLogsResponse {
  data: ActivityLog[]
  total: number
  page: number
  pageSize: number
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
    const res = await this.request.get<{
      organization: Organization
      member: OrganizationMember
      payrollConfig: OrgPayrollConfig | null
      lastPayout: string | null
      memberCount: number
    }[]>('/orgs')
    return res.data
  }
  // 获取公司详情
  async getOrganizationDetail() {
    const res = await this.request.get<string>(`/orgs/${this.orgId}`)
    return res.data
  }
  // 更新公司详情
  async uploadOrganizationDetail(params: { orgName?: string; logoUrl?: string; desc?: string; website?: string }) {
    const res = await this.request.patch<string>(`/orgs/${this.orgId}`, params)
    return res.data
  }
  // 获取公司成员列表
  async getOrganizationMembers(params: {
    page?: number
    pageSize?: number
    status?: OrganizationMember['status']
    keyword?: string
    sortBy?: 'showName' | 'amount' | 'status' | 'createdAt' | 'lastPayment'
    sortOrder?: 'asc' | 'desc'
  } = {}) {
    const { page = 1, pageSize = 20, ...rest } = params
    const res = await this.request.get<MembersResponse>(`/orgs/${this.orgId}/members`, {
      params: { page, pageSize, ...rest }
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
  async sendEmailInvitation(email: string, showName: string, amount?: string) {
    const res = await this.request.post<EmailInvitationResponse>(`/orgs/${this.orgId}/invites`, { email, showName, amount })
    return res.data
  }
  // 更新成员的支付意向（仅 amount，caipChainId 与 token 由组织发薪配置决定）
  async updateMemberPayoutIntent(memberId: string, payload: { amount: string }) {
    const res = await this.request.patch<PayoutIntent>(`/orgs/${this.orgId}/members/${memberId}/payout-intent`, payload)
    return res.data
  }
  // 删除成员
  async deleteMember(memberId: string) {
    const res = await this.request.delete<string>(`/orgs/${this.orgId}/members/${memberId}`)
    return res.data
  }

  // 更新成员角色
  async updateMemberRoles(memberId: string, roles: string[]) {
    const res = await this.request.patch<string>(`/orgs/${this.orgId}/${memberId}/roles`, {
      roles
    })
    return res.data
  }

  // 更新成员展示信息（管理员或本人）
  async updateMemberProfile(orgId: string, memberId: string, payload: { showName?: string; avatarUrl?: string }) {
    const res = await this.request.patch<OrganizationMember>(`/orgs/${orgId}/members/${memberId}/profile`, payload)
    return res.data
  }

  // 员工提交 metaPub（StealthPay）
  async submitMetaPub(payload: { address: string; metaPub: string; signature: string }) {
    const res = await this.request.post<{ success: boolean }>(`/orgs/${this.orgId}/submit-meta-pub`, payload)
    return res.data
  }

  // 审批通过加入申请
  async approveInvite(memberId: string) {
    const res = await this.request.post<{ message: string }>(`/orgs/${this.orgId}/invites/${memberId}/approve`)
    return res.data
  }

  // 下载批量导入成员的 CSV 模板
  async getInviteImportTemplate(): Promise<{ blob: Blob; filename: string }> {
    const res = await this.request.get(`/orgs/${this.orgId}/invites/import-template`, {
      responseType: 'blob'
    })
    const disposition: string = res.headers['content-disposition'] ?? ''
    const match = disposition.match(/filename="?([^";\n]+)"?/)
    const filename = match?.[1] ?? 'members-import-template.csv'
    return { blob: res.data, filename }
  }

  // 拒绝加入申请
  async rejectInvite(memberId: string, reason?: string) {
    const res = await this.request.post<{ message: string }>(`/orgs/${this.orgId}/invites/${memberId}/reject`, { reason })
    return res.data
  }

  // 通过邀请码主动加入组织
  async joinOrganization(payload: { code: string; showName?: string }) {
    const res = await this.request.post<{ orgId: string; memberId: string }>('/orgs/join', payload)
    return res.data
  }

  // 获取组织发薪配置
  async getOrgPayrollConfig() {
    const res = await this.request.get<OrgPayrollConfig | null>(`/orgs/${this.orgId}/payroll-config`)
    return res.data
  }

  // 更新组织发薪配置
  async upsertOrgPayrollConfig(payload: { caipChainId: string; token: string }) {
    const res = await this.request.patch<OrgPayrollConfig>(`/orgs/${this.orgId}/payroll-config`, payload)
    return res.data
  }

  // 查询成员行为日志
  async getMemberActivityLogs(memberId: string, params: { page?: number; pageSize?: number; orgId?: string } = {}) {
    const { page = 1, pageSize = 20, ...rest } = params
    const res = await this.request.get<ActivityLogsResponse>(
      `/orgs/${this.orgId}/members/${memberId}/activity-logs`,
      { params: { page, pageSize, ...rest } },
    )
    return res.data
  }
}
