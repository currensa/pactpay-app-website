/**
 * 权限管理工具
 *
 * 组件内使用：useHasPermission() → (permission) => boolean  （从 store 自动取当前用户角色）
 * 非组件场景：hasPermission(roles, Permission.XXX) → boolean
 *
 * 权限来源：用户登录后调用 /api/orgs 获取，每个组织独立。
 * Owner 拥有所有权限。
 *
 * 权限表（来自产品规范）：
 * ┌────────────────────────────┬───────┬──────────┐
 * │ 功能                        │ Admin │ Operator │
 * ├────────────────────────────┼───────┼──────────┤
 * │ 创建/删除组织                 │  ✅   │    ❌    │
 * │ 选择/修改组织 Network          │  ✅   │    ❌    │
 * │ 验证 Safe Wallet             │  ✅   │    ❌    │
 * │ 设定/更改 Operator            │  ✅   │    ❌    │
 * │ 审批成员加入/退出               │  ✅   │    ✅    │
 * │ 邮箱邀请                      │  ✅   │    ✅    │
 * │ 设置/修改成员邮箱               │  ❌   │    ❌    │
 * │ 设置/修改成员 Service Fee      │  ✅   │    ✅    │
 * │ 批量导入成员                   │  ✅   │    ✅    │
 * │ 移除成员                      │  ✅   │    ✅    │
 * │ 创建 Transaction              │  ✅   │    ✅    │
 * │ 修改/删除 Transaction          │  ✅   │    ✅    │
 * │ 执行 Transaction（Execute）   │  ✅   │    ❌    │
 * │ Re-action Transaction        │  ✅   │    ✅    │
 * │ 查看执行历史                   │  ✅   │    ✅    │
 * │ 修改 Network/支付方式          │  ✅   │    ❌    │
 * │ 与 Safe Wallet 交互           │  ✅   │    ❌    │
 * │ 查看数据看板                   │  ✅   │    ✅    │
 * │ 导出历史数据                   │  ✅   │    ✅    │
 * └────────────────────────────┴───────┴──────────┘
 */

import { OrganizationMember } from '@/apis/orgnization.api'
import useOrganizationStore from '@/stores/organization'
import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

// 与后端 OrganizationMemberRole 枚举保持一致
export type MemberRole = 'Owner' | 'Admin' | 'Operator' | 'Member'

export enum Permission {
  // 组织管理（仅 Admin+）
  CREATE_DELETE_ORG    = 'create_delete_org',
  MODIFY_ORG_NETWORK   = 'modify_org_network',
  VERIFY_SAFE_WALLET   = 'verify_safe_wallet',
  SET_OPERATOR         = 'set_operator',
  MODIFY_PAYMENT_NETWORK = 'modify_payment_network',
  INTERACT_SAFE_WALLET = 'interact_safe_wallet',

  // 成员管理
  APPROVE_MEMBER       = 'approve_member',      // Admin + Operator
  INVITE_MEMBER        = 'invite_member',        // Admin + Operator
  MODIFY_MEMBER_FEE    = 'modify_member_fee',   // Admin + Operator
  IMPORT_MEMBERS       = 'import_members',       // Admin + Operator
  REMOVE_MEMBER        = 'remove_member',        // Admin + Operator

  // Transaction 管理
  CREATE_TRANSACTION   = 'create_transaction',  // Admin + Operator
  MODIFY_TRANSACTION   = 'modify_transaction',  // Admin + Operator
  EXECUTE_TRANSACTION  = 'execute_transaction', // Admin + Operator
  REACTION_TRANSACTION = 'reaction_transaction',// Admin + Operator

  // 数据查看
  VIEW_HISTORY         = 'view_history',        // Admin + Operator + Member
  VIEW_DASHBOARD       = 'view_dashboard',      // Admin + Operator + Member
  EXPORT_DATA          = 'export_data',          // Admin + Operator
}

// ─── 角色权限映射表（Owner 在运行时动态获得全部权限） ───────────────────────
const ALL_PERMISSIONS = Object.values(Permission)

const rolePermissionsMap: Record<MemberRole, Permission[]> = {
  Owner: ALL_PERMISSIONS,

  Admin: [
    Permission.CREATE_DELETE_ORG,
    Permission.MODIFY_ORG_NETWORK,
    Permission.VERIFY_SAFE_WALLET,
    Permission.SET_OPERATOR,
    Permission.MODIFY_PAYMENT_NETWORK,
    Permission.INTERACT_SAFE_WALLET,
    Permission.APPROVE_MEMBER,
    Permission.INVITE_MEMBER,
    Permission.MODIFY_MEMBER_FEE,
    Permission.IMPORT_MEMBERS,
    Permission.REMOVE_MEMBER,
    Permission.CREATE_TRANSACTION,
    Permission.MODIFY_TRANSACTION,
    Permission.EXECUTE_TRANSACTION,
    Permission.REACTION_TRANSACTION,
    Permission.VIEW_HISTORY,
    Permission.VIEW_DASHBOARD,
    Permission.EXPORT_DATA,
  ],

  Operator: [
    Permission.APPROVE_MEMBER,
    Permission.INVITE_MEMBER,
    Permission.MODIFY_MEMBER_FEE,
    Permission.IMPORT_MEMBERS,
    Permission.REMOVE_MEMBER,
    Permission.CREATE_TRANSACTION,
    Permission.MODIFY_TRANSACTION,
    Permission.REACTION_TRANSACTION,
    Permission.EXECUTE_TRANSACTION,
    Permission.VIEW_HISTORY,
    Permission.VIEW_DASHBOARD,
    Permission.EXPORT_DATA,
  ],

  Member: [
    Permission.VIEW_HISTORY,
    Permission.VIEW_DASHBOARD,
  ],
}

// ─── 核心 API ────────────────────────────────────────────────────────────────

/**
 * 判断用户是否具有某项权限。
 * 传入用户在当前组织的角色列表（来自 /api/orgs），返回布尔值。
 */
export function hasPermission(userRoles: MemberRole[], permission: Permission): boolean {
  if (!userRoles || userRoles.length === 0) return false
  return userRoles.some(role => rolePermissionsMap[role]?.includes(permission))
}

// ─── 角色层级工具（用于判断"能否操作某成员"） ───────────────────────────────

/** 优先级：Owner > Admin > Operator > Member */
export function getPrimaryRole(roles?: MemberRole[]): MemberRole {
  const priority: MemberRole[] = ['Owner', 'Admin', 'Operator', 'Member']
  for (const role of priority) {
    if (roles?.includes(role)) return role
  }
  return 'Member'
}

/**
 * 从 API 返回的角色对象数组中提取最高权限角色名。
 * 接受 `{ role: string }[]` 结构（如 OrganizationMember['roles']）。
 * 优先级：Owner > Admin > Operator > Member
 */
export function getHighestRole(roles?: { role: string }[]): MemberRole {
  return getPrimaryRole(roles?.map(r => r.role as MemberRole))
}

/**
 * 判断当前用户是否可以对目标成员执行管理操作（基于角色层级）。
 * 只能操作比自己角色低的人：
 *   Owner    → 可管理 Admin / Operator / Member
 *   Admin    → 可管理 Operator / Member
 *   Operator → 可管理 Member
 */
export function canManageMember(currentUserRoles: MemberRole[], targetMemberRoles: MemberRole[]): boolean {
  const currentPrimary = getPrimaryRole(currentUserRoles)
  const targetPrimary  = getPrimaryRole(targetMemberRoles)

  const hierarchy: MemberRole[] = ['Owner', 'Admin', 'Operator', 'Member']
  return hierarchy.indexOf(currentPrimary) < hierarchy.indexOf(targetPrimary)
}

/**
 * 返回当前用户可以分配给他人的角色列表（严格低于自身最高角色）。
 * 仅 Owner/Admin/Operator 有 SET_OPERATOR 或更高权限时才有意义。
 */
export function getAssignableRoles(currentUserRoles: MemberRole[]): MemberRole[] {
  const primary = getPrimaryRole(currentUserRoles)
  const hierarchy: MemberRole[] = ['Owner', 'Admin', 'Operator', 'Member']
  const idx = hierarchy.indexOf(primary)
  // 只返回严格低于自身的角色，且排除 Owner（Owner 不可通过此界面分配）
  return hierarchy.slice(idx + 1)
}

// ─── Hook（组件内使用） ──────────────────────────────────────────────────────

/**
 * 在组件中使用。从 store 读取当前用户角色，返回一个权限检查函数。
 *
 * @example
 * const hasPermission = useHasPermission()
 * hasPermission(Permission.REMOVE_MEMBER) // → boolean
 */
export function useHasPermission(): (permission: Permission) => boolean {
  const currentMember = useOrganizationStore(s => s.currentMember)
  const navigate = useNavigate()

  useEffect(() => {
    if (!currentMember) navigate('/welcome', { replace: true })
  }, [currentMember])

  const roles = useMemo(() => getMemberRoles(currentMember), [currentMember])
  return useMemo(() => (permission: Permission) => hasPermission(roles, permission), [roles])
}

// ─── 辅助工具 ────────────────────────────────────────────────────────────────

export function isOwner(userRoles: MemberRole[]): boolean {
  return userRoles?.includes('Owner') ?? false
}

export function getMemberRoles(member: OrganizationMember | null | undefined): MemberRole[] {
  if (!member?.roles || member.roles.length === 0) return []
  return member.roles.map(r => r.role as MemberRole)
}

export function getRoleDisplayNames(): Record<MemberRole, string> {
  return { Owner: 'Owner', Admin: 'Admin', Operator: 'Operator', Member: 'Member' }
}

export function getRoleDisplayNamesCN(): Record<MemberRole, string> {
  return { Owner: '所有者', Admin: '管理员', Operator: '操作员', Member: '员工' }
}
