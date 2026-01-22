// 类型定义
export type MemberRole = 'Admin' | 'Operator' | 'Member'
export type MemberStatus = 'Active' | 'Pending' | 'Inactive'
export type SortField = 'name' | 'serviceFee' | 'lastPayment' | null
export type SortDirection = 'asc' | 'desc' | null

export interface Member {
  id: string
  memberId: string
  name: string
  email: string
  receivingWallet: string | null
  network: string
  role: MemberRole
  roles?: MemberRole[]
  serviceFee: number
  currency?: string
  status: MemberStatus
  lastPayment: string | null
  joinDate: string
  avatar?: string
}

export interface DrawerChanges {
  receivingWallet?: string
  serviceFee?: number
  currency?: string
  role?: MemberRole
  roles?: MemberRole[]
}
