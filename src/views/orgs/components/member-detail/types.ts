import { MemberRole } from '@/utils/permissions'

export type { MemberRole }
export type SortField = 'name' | 'serviceFee' | 'lastPayment' | null
export type SortDirection = 'asc' | 'desc' | null

/** Backend role values (authoritative) */
export type BackendRole = 'Owner' | 'Admin' | 'Operator' | 'Member'

export interface DrawerChanges {
  showName?: string
  /** Raw amount string, e.g. "1000000000" */
  amount?: string
  roles?: BackendRole[]
  role?: MemberRole
}
