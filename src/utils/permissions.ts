/**
 * 权限管理工具
 * 定义角色和权限检查函数
 */

import { OrganizationMember } from '@/apis/orgnization.api'

// 与后端 OrganizationMemberRole 枚举保持一致
export type MemberRole = 'Owner' | 'Admin' | 'Operator' | 'Employee'

// 定义权限类型
export enum Permission {
  // 组织管理
  CREATE_DELETE_ORG = 'create_delete_org',
  MODIFY_ORG_INFO = 'modify_org_info',
  TRANSFER_OWNER = 'transfer_owner',
  SET_ADMIN = 'set_admin',
  SET_OPERATOR = 'set_operator',

  // 成员管理
  APPROVE_MEMBER = 'approve_member',
  INVITE_MEMBER = 'invite_member',
  IMPORT_MEMBERS = 'import_members',
  REMOVE_MEMBER = 'remove_member',
  MODIFY_MEMBER_INFO = 'modify_member_info',

  // Transaction 管理
  CREATE_TRANSACTION = 'create_transaction',
  MODIFY_TRANSACTION = 'modify_transaction',
  VIEW_TRANSACTION = 'view_transaction',

  // 支付管理
  PROPOSE_TRANSACTION = 'propose_transaction',
  SIGN_TRANSACTION = 'sign_transaction',
  EXECUTE_TRANSACTION = 'execute_transaction',
  REACTION_TRANSACTION = 'reaction_transaction',

  // 数据查看
  VIEW_DASHBOARD = 'view_dashboard',
  EXPORT_DATA = 'export_data',

  // 自身信息
  MODIFY_OWN_INFO = 'modify_own_info'
}

// 角色权限映射表
const rolePermissionsMap: Record<MemberRole, Permission[]> = {
  Owner: [
    Permission.CREATE_DELETE_ORG,
    Permission.MODIFY_ORG_INFO,
    Permission.TRANSFER_OWNER,
    Permission.SET_ADMIN,
    Permission.SET_OPERATOR,
    Permission.APPROVE_MEMBER,
    Permission.INVITE_MEMBER,
    Permission.IMPORT_MEMBERS,
    Permission.REMOVE_MEMBER,
    Permission.MODIFY_MEMBER_INFO,
    Permission.CREATE_TRANSACTION,
    Permission.MODIFY_TRANSACTION,
    Permission.VIEW_TRANSACTION,
    Permission.PROPOSE_TRANSACTION,
    Permission.SIGN_TRANSACTION,
    Permission.EXECUTE_TRANSACTION,
    Permission.REACTION_TRANSACTION,
    Permission.VIEW_DASHBOARD,
    Permission.EXPORT_DATA,
    Permission.MODIFY_OWN_INFO
  ],
  Admin: [
    Permission.MODIFY_ORG_INFO,
    Permission.SET_OPERATOR,
    Permission.APPROVE_MEMBER,
    Permission.INVITE_MEMBER,
    Permission.IMPORT_MEMBERS,
    Permission.REMOVE_MEMBER,
    Permission.MODIFY_MEMBER_INFO,
    Permission.CREATE_TRANSACTION,
    Permission.MODIFY_TRANSACTION,
    Permission.VIEW_TRANSACTION,
    Permission.PROPOSE_TRANSACTION,
    Permission.SIGN_TRANSACTION,
    Permission.EXECUTE_TRANSACTION,
    Permission.REACTION_TRANSACTION,
    Permission.VIEW_DASHBOARD,
    Permission.EXPORT_DATA,
    Permission.MODIFY_OWN_INFO
  ],
  Operator: [
    Permission.SET_OPERATOR,
    Permission.APPROVE_MEMBER,
    Permission.INVITE_MEMBER,
    Permission.IMPORT_MEMBERS,
    Permission.REMOVE_MEMBER,
    Permission.MODIFY_MEMBER_INFO,
    Permission.CREATE_TRANSACTION,
    Permission.MODIFY_TRANSACTION,
    Permission.VIEW_TRANSACTION,
    Permission.SIGN_TRANSACTION,
    Permission.REACTION_TRANSACTION,
    Permission.VIEW_DASHBOARD,
    Permission.EXPORT_DATA,
    Permission.MODIFY_OWN_INFO
  ],
  Employee: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_TRANSACTION,
    Permission.MODIFY_OWN_INFO
  ]
}

export function hasPermission(userRoles: MemberRole[], permission: Permission): boolean {
  if (!userRoles || userRoles.length === 0) return false
  return userRoles.some(role => rolePermissionsMap[role]?.includes(permission))
}

export function isAdmin(userRoles: MemberRole[]): boolean {
  if (!userRoles || userRoles.length === 0) return false
  return userRoles.some(role => role === 'Owner' || role === 'Admin' || role === 'Operator')
}

export function isOwner(userRoles: MemberRole[]): boolean {
  return userRoles?.includes('Owner') || false
}

/**
 * 检查当前用户是否可以管理目标成员
 * Owner  → 可管理所有人
 * Admin  → 可管理 Operator / Employee（不可操作 Owner / Admin）
 * Operator → 只能管理 Employee
 */
export function canManageMember(currentUserRoles: MemberRole[], targetMemberRoles: MemberRole[]): boolean {
  if (isOwner(currentUserRoles)) return true

  if (currentUserRoles.includes('Admin')) {
    return !targetMemberRoles.includes('Owner') && !targetMemberRoles.includes('Admin')
  }

  if (currentUserRoles.includes('Operator')) {
    return (
      !targetMemberRoles.includes('Owner') &&
      !targetMemberRoles.includes('Admin') &&
      !targetMemberRoles.includes('Operator')
    )
  }

  return false
}

/** 优先级：Owner > Admin > Operator > Employee */
export function getPrimaryRole(roles?: MemberRole[]): MemberRole {
  if (!roles || roles.length === 0) return 'Employee'
  const priority: MemberRole[] = ['Owner', 'Admin', 'Operator', 'Employee']
  for (const role of priority) {
    if (roles.includes(role)) return role
  }
  return 'Employee'
}

export function getMemberRoles(member: OrganizationMember): MemberRole[] {
  if (!member.roles || member.roles.length === 0) return ['Employee']
  return member.roles.map(r => r.role as MemberRole)
}

export function canModifyMemberInfo(
  currentUserRoles: MemberRole[],
  targetMemberId: string,
  currentUserId: string
): boolean {
  if (targetMemberId === currentUserId) return true
  return hasPermission(currentUserRoles, Permission.MODIFY_MEMBER_INFO)
}

export function getRoleDisplayNames(): Record<MemberRole, string> {
  return {
    Owner: 'Owner',
    Admin: 'Admin',
    Operator: 'Operator',
    Employee: 'Employee'
  }
}

export function getRoleDisplayNamesCN(): Record<MemberRole, string> {
  return {
    Owner: '所有者',
    Admin: '管理员',
    Operator: '操作员',
    Employee: '员工'
  }
}
