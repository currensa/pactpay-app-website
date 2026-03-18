# 权限系统更新说明

## 概述

本次更新统一了整个应用的角色和权限管理系统，将原来的 3 个角色扩展为 5 个角色，并实现了基于权限的访问控制。

## 角色定义更新

### 旧角色系统
- `Admin` - 管理员
- `Operator` - 操作员  
- `Member` - 成员

### 新角色系统
- `Owner` - 所有者（拥有所有权限）
- `Org Admin` - 组织管理员
- `Pay Admin` - 支付管理员
- `Operator` - 操作员
- `Employee` - 员工（原 Member，只能修改自己的信息）

## 核心功能

### 1. 多角色支持
- 一个成员可以同时拥有多个角色
- 系统会根据所有角色的权限并集来判断用户权限
- UI 中会显示用户的所有角色标签

### 2. 统一权限管理
创建了 `src/utils/permissions.ts` 工具文件，提供以下功能：

#### 主要函数
- `hasPermission(userRoles, permission)` - 检查用户是否有特定权限
- `isAdmin(userRoles)` - 检查是否是管理员
- `isOwner(userRoles)` - 检查是否是 Owner
- `canManageMember(currentUserRoles, targetMemberRoles)` - 检查是否可以管理某个成员
- `getPrimaryRole(roles)` - 获取主要角色（用于显示）
- `getMemberRoles(member)` - 从成员对象获取角色数组
- `canModifyMemberInfo(currentUserRoles, targetMemberId, currentUserId)` - 检查是否可以修改成员信息

#### 权限类型（Permission Enum）
包含以下权限类型：
- **组织管理**：创建/删除组织、修改组织信息、转让 Owner、设置管理员等
- **成员管理**：审批、邀请、导入、移除、修改成员信息
- **Transaction 管理**：创建、修改、查看 Transaction
- **支付管理**：绑定 Safe Wallet、修改网络、提交/签名/执行交易等
- **数据查看**：查看看板、导出数据
- **自身信息**：修改自己的信息

## 权限矩阵

### 组织管理
| 功能 | Owner | Org Admin | Pay Admin | Operator | Employee |
|------|-------|-----------|-----------|----------|----------|
| 创建/删除组织 | ✅ | ❌ | ❌ | ❌ | ❌ |
| 修改组织基本信息 | ✅ | ✅ | ❌ | ❌ | ❌ |
| 转让 Owner | ✅ | ❌ | ❌ | ❌ | ❌ |
| 设定/更改 Org Admin | ✅ | ❌ | ❌ | ❌ | ❌ |
| 设定/更改 Pay Admin | ✅ | ❌ | ❌ | ❌ | ❌ |
| 设定/更改 Operator | ✅ | ✅ | ❌ | ❌ | ❌ |

### 成员管理
| 功能 | Owner | Org Admin | Pay Admin | Operator | Employee |
|------|-------|-----------|-----------|----------|----------|
| 审批成员加入/退出 | ✅ | ✅ | ❌ | ✅ | ❌ |
| 邀请成员 | ✅ | ✅ | ❌ | ✅ | ❌ |
| 批量导入成员 | ✅ | ✅ | ❌ | ✅ | ❌ |
| 移除成员 | ✅ | ✅ | ❌ | ✅ | ❌ |
| 设置/修改成员信息 | ✅ | ✅ | ❌ | ✅ | ❌ |

### Transaction 管理
| 功能 | Owner | Org Admin | Pay Admin | Operator | Employee |
|------|-------|-----------|-----------|----------|----------|
| 创建 Transaction | ✅ | ✅ | ✅ | ✅ | ❌ |
| 修改/删除 Transaction | ✅ | ✅ | ✅ | ✅ | ❌ |
| 查看 Transaction 列表 | ✅ | ✅ | ✅ | ✅ | ✅ |

### 支付管理
| 功能 | Owner | Org Admin | Pay Admin | Operator | Employee |
|------|-------|-----------|-----------|----------|----------|
| 绑定/解绑 Safe Wallet | ✅ | ❌ | ✅ | ❌ | ❌ |
| 修改 Network | ✅ | ❌ | ✅ | ❌ | ❌ |
| 提交 Transaction (Propose) | ✅ | ❌ | ✅ | ❌ | ❌ |
| 添加链下签名 (Sign) | ✅ | ❌ | ✅ | ✅ | ❌ |
| 执行 Transaction (Execute) | ✅ | ❌ | ✅ | ❌ | ❌ |
| Re-action Transaction | ✅ | ❌ | ✅ | ✅ | ❌ |
| 增删 Signer | ✅ | ❌ | ✅ | ❌ | ❌ |

### 数据查看
| 功能 | Owner | Org Admin | Pay Admin | Operator | Employee |
|------|-------|-----------|-----------|----------|----------|
| 查看数据看板 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 导出历史数据 | ✅ | ✅ | ✅ | ✅ | ❌ |

## 更新的文件

### 1. 新建文件
- `src/utils/permissions.ts` - 权限管理核心工具

### 2. 更新的类型定义文件
- `src/apis/orgnization.api.ts` - 更新 MemberRole 接口
- `src/views/orgs/components/member-detail/types.ts` - 更新 MemberRole 类型并引用统一的权限工具

### 3. 更新的页面组件
- `src/views/orgs/dashboard.tsx` - 使用新的权限系统，支持基于权限的操作按钮显示
- `src/views/orgs/members.tsx` - 使用新的权限系统，显示多角色标签
- `src/views/orgs/components/member-detail/member-detail-content.tsx` - 支持多角色选择和管理
- `src/views/orgs/settings.tsx` - 使用新的权限系统判断 Safe Wallet 管理权限

## 使用示例

### 检查权限
```typescript
import { hasPermission, Permission } from '@/utils/permissions'

// 检查用户是否有审批成员的权限
if (hasPermission(userRoles, Permission.APPROVE_MEMBER)) {
  // 显示审批按钮
}
```

### 检查是否可以管理某个成员
```typescript
import { canManageMember } from '@/utils/permissions'

const currentUserRoles: MemberRole[] = ['Org Admin']
const targetMemberRoles: MemberRole[] = ['Employee']

if (canManageMember(currentUserRoles, targetMemberRoles)) {
  // 显示管理操作
}
```

### 获取成员角色
```typescript
import { getMemberRoles, getPrimaryRole } from '@/utils/permissions'

// 从 API 返回的成员对象获取角色数组
const roles = getMemberRoles(member)

// 获取主要角色（用于显示）
const primaryRole = getPrimaryRole(roles)
```

## 注意事项

1. **当前用户角色获取**：在所有更新的文件中，当前用户角色都是硬编码的（例如 `['Owner']`），需要后续从 context 或 store 中获取实际的用户角色。相关代码都标注了 `// TODO: 从 context 获取`。

2. **Employee 权限**：Employee 只能查看数据和修改自己的信息，不能管理其他成员或执行管理操作。

3. **多角色权限并集**：当用户拥有多个角色时，系统会取所有角色权限的并集，即只要任一角色有某权限，用户就拥有该权限。

4. **角色优先级**：显示主要角色时的优先级为 `Owner > Org Admin > Pay Admin > Operator > Employee`。

5. **Owner 特殊性**：Owner 角色不能通过成员详情页面设置，需要通过特殊的"转让 Owner"功能来变更。

## 后续工作

1. 实现 context 或 store 来管理当前登录用户的角色信息
2. 在后端 API 中实施相同的权限验证逻辑
3. 添加权限不足时的友好提示
4. 实现角色变更的审计日志
5. 添加单元测试覆盖权限判断逻辑
