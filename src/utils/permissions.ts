/**
 * 权限管理工具
 * 定义角色和权限检查函数
 */

import { OrganizationMember } from '@/apis/orgnization.api'

// 定义所有角色类型
export type MemberRole = 'Owner' | 'Org Admin' | 'Pay Admin' | 'Operator' | 'Employee'

// 定义权限类型
export enum Permission {
  // 组织管理
  CREATE_DELETE_ORG = 'create_delete_org',
  MODIFY_ORG_INFO = 'modify_org_info',
  TRANSFER_OWNER = 'transfer_owner',
  SET_ORG_ADMIN = 'set_org_admin',
  SET_PAY_ADMIN = 'set_pay_admin',
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
  BIND_SAFE_WALLET = 'bind_safe_wallet',
  MODIFY_NETWORK = 'modify_network',
  PROPOSE_TRANSACTION = 'propose_transaction',
  SIGN_TRANSACTION = 'sign_transaction',
  EXECUTE_TRANSACTION = 'execute_transaction',
  REACTION_TRANSACTION = 'reaction_transaction',
  MANAGE_SIGNER = 'manage_signer',

  // 数据查看
  VIEW_DASHBOARD = 'view_dashboard',
  EXPORT_DATA = 'export_data',

  // 自身信息
  MODIFY_OWN_INFO = 'modify_own_info'
}

// 角色权限映射表
const rolePermissionsMap: Record<MemberRole, Permission[]> = {
  Owner: [
    // 组织管理 - 全部权限
    Permission.CREATE_DELETE_ORG,
    Permission.MODIFY_ORG_INFO,
    Permission.TRANSFER_OWNER,
    Permission.SET_ORG_ADMIN,
    Permission.SET_PAY_ADMIN,
    Permission.SET_OPERATOR,
    // 成员管理 - 全部权限
    Permission.APPROVE_MEMBER,
    Permission.INVITE_MEMBER,
    Permission.IMPORT_MEMBERS,
    Permission.REMOVE_MEMBER,
    Permission.MODIFY_MEMBER_INFO,
    // Transaction 管理 - 全部权限
    Permission.CREATE_TRANSACTION,
    Permission.MODIFY_TRANSACTION,
    Permission.VIEW_TRANSACTION,
    // 支付管理 - 全部权限
    Permission.BIND_SAFE_WALLET,
    Permission.MODIFY_NETWORK,
    Permission.PROPOSE_TRANSACTION,
    Permission.SIGN_TRANSACTION,
    Permission.EXECUTE_TRANSACTION,
    Permission.REACTION_TRANSACTION,
    Permission.MANAGE_SIGNER,
    // 数据查看 - 全部权限
    Permission.VIEW_DASHBOARD,
    Permission.EXPORT_DATA,
    // 自身信息
    Permission.MODIFY_OWN_INFO
  ],
  'Org Admin': [
    // 组织管理
    Permission.MODIFY_ORG_INFO,
    // 成员管理 - 全部权限
    Permission.APPROVE_MEMBER,
    Permission.INVITE_MEMBER,
    Permission.IMPORT_MEMBERS,
    Permission.REMOVE_MEMBER,
    Permission.MODIFY_MEMBER_INFO,
    // Transaction 管理 - 全部权限
    Permission.CREATE_TRANSACTION,
    Permission.MODIFY_TRANSACTION,
    Permission.VIEW_TRANSACTION,
    // 数据查看 - 全部权限
    Permission.VIEW_DASHBOARD,
    Permission.EXPORT_DATA,
    // 自身信息
    Permission.MODIFY_OWN_INFO
  ],
  'Pay Admin': [
    // 成员管理 - 无权限
    // Transaction 管理 - 全部权限
    Permission.CREATE_TRANSACTION,
    Permission.MODIFY_TRANSACTION,
    Permission.VIEW_TRANSACTION,
    // 支付管理 - 全部权限(除了添加签名)
    Permission.BIND_SAFE_WALLET,
    Permission.MODIFY_NETWORK,
    Permission.PROPOSE_TRANSACTION,
    Permission.SIGN_TRANSACTION,
    Permission.EXECUTE_TRANSACTION,
    Permission.REACTION_TRANSACTION,
    Permission.MANAGE_SIGNER,
    // 数据查看 - 全部权限
    Permission.VIEW_DASHBOARD,
    Permission.EXPORT_DATA,
    // 自身信息
    Permission.MODIFY_OWN_INFO
  ],
  Operator: [
    // 组织管理
    Permission.SET_OPERATOR,
    // 成员管理 - 全部权限
    Permission.APPROVE_MEMBER,
    Permission.INVITE_MEMBER,
    Permission.IMPORT_MEMBERS,
    Permission.REMOVE_MEMBER,
    Permission.MODIFY_MEMBER_INFO,
    // Transaction 管理 - 全部权限
    Permission.CREATE_TRANSACTION,
    Permission.MODIFY_TRANSACTION,
    Permission.VIEW_TRANSACTION,
    // 支付管理 - 部分权限
    Permission.SIGN_TRANSACTION,
    Permission.REACTION_TRANSACTION,
    // 数据查看 - 全部权限
    Permission.VIEW_DASHBOARD,
    Permission.EXPORT_DATA,
    // 自身信息
    Permission.MODIFY_OWN_INFO
  ],
  Employee: [
    // 员工只能查看和修改自己的信息
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_TRANSACTION,
    Permission.MODIFY_OWN_INFO
  ]
}

/**
 * 检查用户是否有特定权限
 * @param userRoles - 用户拥有的角色数组
 * @param permission - 要检查的权限
 * @returns 是否有该权限
 */
export function hasPermission(userRoles: MemberRole[], permission: Permission): boolean {
  if (!userRoles || userRoles.length === 0) {
    return false
  }

  // 只要用户的任一角色有该权限,就返回 true
  return userRoles.some(role => {
    const permissions = rolePermissionsMap[role]
    return permissions && permissions.includes(permission)
  })
}

/**
 * 检查用户是否是管理员(Owner, Org Admin, Pay Admin, Operator)
 * @param userRoles - 用户拥有的角色数组
 * @returns 是否是管理员
 */
export function isAdmin(userRoles: MemberRole[]): boolean {
  if (!userRoles || userRoles.length === 0) {
    return false
  }
  const adminRoles: MemberRole[] = ['Owner', 'Org Admin', 'Pay Admin', 'Operator']
  return userRoles.some(role => adminRoles.includes(role))
}

/**
 * 检查用户是否是 Owner
 * @param userRoles - 用户拥有的角色数组
 * @returns 是否是 Owner
 */
export function isOwner(userRoles: MemberRole[]): boolean {
  return userRoles?.includes('Owner') || false
}

/**
 * 检查用户是否可以管理另一个成员
 * @param currentUserRoles - 当前用户的角色
 * @param targetMemberRoles - 目标成员的角色
 * @returns 是否可以管理该成员
 */
export function canManageMember(currentUserRoles: MemberRole[], targetMemberRoles: MemberRole[]): boolean {
  // Owner 可以管理所有人
  if (isOwner(currentUserRoles)) {
    return true
  }

  // Org Admin 可以管理除了 Owner 之外的所有人
  if (currentUserRoles.includes('Org Admin')) {
    return !targetMemberRoles.includes('Owner')
  }

  // Operator 可以管理 Employee
  if (currentUserRoles.includes('Operator')) {
    return (
      !targetMemberRoles.includes('Owner') &&
      !targetMemberRoles.includes('Org Admin') &&
      !targetMemberRoles.includes('Pay Admin') &&
      !targetMemberRoles.includes('Operator')
    )
  }

  return false
}

/**
 * 获取成员的主要角色(显示用)
 * @param roles - 成员的角色数组
 * @returns 主要角色
 */
export function getPrimaryRole(roles?: MemberRole[]): MemberRole {
  if (!roles || roles.length === 0) {
    return 'Employee'
  }

  // 优先级: Owner > Org Admin > Pay Admin > Operator > Employee
  const rolePriority: MemberRole[] = ['Owner', 'Org Admin', 'Pay Admin', 'Operator', 'Employee']
  for (const role of rolePriority) {
    if (roles.includes(role)) {
      return role
    }
  }

  return 'Employee'
}

/**
 * 从 OrganizationMember 获取角色数组
 * @param member - 组织成员对象
 * @returns 角色数组
 */
export function getMemberRoles(member: OrganizationMember): MemberRole[] {
  if (!member.roles || member.roles.length === 0) {
    return ['Employee']
  }
  return member.roles.map(r => r.role as MemberRole)
}

/**
 * 检查用户是否可以修改成员信息
 * @param currentUserRoles - 当前用户的角色
 * @param targetMemberId - 目标成员ID
 * @param currentUserId - 当前用户ID
 * @returns 是否可以修改
 */
export function canModifyMemberInfo(
  currentUserRoles: MemberRole[],
  targetMemberId: string,
  currentUserId: string
): boolean {
  // 可以修改自己的信息
  if (targetMemberId === currentUserId) {
    return true
  }

  // 有修改成员信息权限
  return hasPermission(currentUserRoles, Permission.MODIFY_MEMBER_INFO)
}

/**
 * 获取所有角色的显示名称
 * @returns 角色显示名称映射
 */
export function getRoleDisplayNames(): Record<MemberRole, string> {
  return {
    Owner: 'Owner',
    'Org Admin': 'Org Admin',
    'Pay Admin': 'Pay Admin',
    Operator: 'Operator',
    Employee: 'Employee'
  }
}

/**
 * 获取角色的中文显示名称
 * @returns 角色中文显示名称映射
 */
export function getRoleDisplayNamesCN(): Record<MemberRole, string> {
  return {
    Owner: '所有者',
    'Org Admin': '组织管理员',
    'Pay Admin': '支付管理员',
    Operator: '操作员',
    Employee: '员工'
  }
}
