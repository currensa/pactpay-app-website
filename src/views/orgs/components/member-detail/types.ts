import { MemberRole } from '@/utils/permissions'

export type { MemberRole }
export type MemberStatus = 'Active' | 'Pending' | 'Inactive'
export type SortField = 'name' | 'serviceFee' | 'lastPayment' | null
export type SortDirection = 'asc' | 'desc' | null

/** Backend role values (authoritative) */
export type BackendRole = 'Owner' | 'Admin' | 'Operator' | 'Employee'

export interface Member {
  id: string
  memberId: string
  name: string
  email: string
  role: MemberRole
  roles?: MemberRole[]
  serviceFee: number
  status: MemberStatus
  lastPayment: string | null
  joinDate: string
  avatar?: string
}

export interface DrawerChanges {
  name?: string
  /** Raw amount string, e.g. "1000000000" */
  amount?: string
  roles?: BackendRole[]
  role?: MemberRole
}
