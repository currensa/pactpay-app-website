import EmployeeLayout from '@/layouts/employee-layout'
import OrgLayout from '@/layouts/org-layout'
import {
  IconAlignBoxBottomRight,
  IconCashMove,
  IconLayoutDashboard,
  IconSettings,
  IconUsers
} from '@tabler/icons-react'
import { lazy } from 'react'
import { createBrowserRouter, Navigate, RouteObject } from 'react-router-dom'

export interface OrgNavChild {
  title: string
  url: string
  /** 组织 logo，显示在子菜单项左侧 */
  logoUrl?: string
  /** 覆盖默认导航行为（如需携带 location.state） */
  onClick?: () => void
  /** 覆盖默认激活判断逻辑 */
  isActive?: (pathname: string, locationState: unknown) => boolean
}

export interface OrgNavItem {
  title: string
  key: string
  url: string
  icon: React.ElementType
  children?: OrgNavChild[]
}

const Login = lazy(() => import('@/views/account/login'))
const JoinInvite = lazy(() => import('@/views/account/join-invite'))

const EmployeeDashboard = lazy(() => import('@/views/employee/dashboard'))
const EmployeeOrgsDetail = lazy(() => import('@/views/employee/orgsdetail'))
const EmployeeClaim = lazy(() => import('@/views/employee/claim'))
const EmployeeSettings = lazy(() => import('@/views/employee/settings'))

const Dashboard = lazy(() => import('@/views/orgs/dashboard'))
const Members = lazy(() => import('@/views/orgs/members'))
const Transaction = lazy(() => import('@/views/transaction/transaction'))
const CreateTransaction = lazy(() => import('@/views/transaction/create-transaction'))
const Analytics = lazy(() => import('@/views/orgs/analytics'))
const OrganizationSettings = lazy(() => import('@/views/orgs/settings/organization'))
const RoleManagement = lazy(() => import('@/views/orgs/roles'))
const TransactionDetail = lazy(() => import('@/views/transaction/transaction-detail'))

type RouteItem = RouteObject & {
  meta?: {
    title?: string
    subtitle?: string
    /** 在侧边栏菜单中隐藏该项 */
    hideInMenu?: boolean
    [key: string]: string | number | boolean | undefined
  }
  /** 侧边栏图标，仅顶层菜单项需要 */
  navIcon?: React.ElementType
  children?: RouteItem[]
}

const routes: RouteItem[] = [
  {
    index: true, element: <Navigate to="/account/login" />
  },
  {
    path: 'join/:code',
    element: <JoinInvite />,
  },
  {
    path: 'account',
    children: [
      { path: 'login', element: <Login />, meta: { title: 'Login' } },
      // {
      //   path: 'settings',
      //   element: <AccountLayout />,
      //   children: [
      //     { index: true, element: <Navigate to="/account/settings/account" replace /> },
      //     { path: 'account', element: <AccountSettings />, meta: { title: 'Account & Security' } },
      //     { path: 'preferences', element: <PreferencesSettings />, meta: { title: 'General Preferences' } },
      //     { path: 'privacy', element: <PrivacySettings />, meta: { title: 'Privacy & Data' } }
      //   ]
      // }
    ] as RouteItem[]
  },
  {
    path: 'orgs',
    element: <OrgLayout />,
    children: [
      { index: true, element: <Navigate to="/orgs/dashboard" /> },
      { path: 'dashboard', navIcon: IconLayoutDashboard, element: <Dashboard />, meta: { title: 'Dashboard', subtitle: "Monitor your organization's key metrics and activities" } },
      { path: 'members', navIcon: IconUsers, element: <Members showInvite />, meta: { title: 'Members', subtitle: 'Manage your organization members' } },
      // { path: 'roles', navIcon: IconShield, element: <RoleManagement />, meta: { title: 'Role Management' } },
      { path: 'transaction', navIcon: IconCashMove, element: <Transaction />, meta: { title: 'Transactions', subtitle: 'View and manage payment transactions' } },
      { path: 'transaction/create', element: <CreateTransaction />, meta: { title: 'Create Transaction', subtitle: 'Set up a new payment transaction', hideInMenu: true } },
      { path: 'analytics', navIcon: IconAlignBoxBottomRight, element: <Analytics />, meta: { title: 'Analytics', subtitle: 'Track your payment analytics', hideInMenu: false } },
      {
        path: 'settings',
        navIcon: IconSettings,
        element: <OrganizationSettings />,
        meta: { title: 'Settings', subtitle: 'Manage your organization settings' }
      }
    ] as RouteItem[]
  },
  // { path: 'transaction/:batchId', element: <TransactionDetail />, meta: { title: 'Transaction Detail' } },
  {
    path: 'employee',
    children: [
      {
        element: <EmployeeLayout />,
        children: [
          { index: true, element: <Navigate to="employee/dashboard" /> },
          { path: 'dashboard', navIcon: IconLayoutDashboard, element: <EmployeeDashboard />, meta: { title: 'Dashboard', subtitle: "Monitor your organization's key metrics and activities" } },
          { path: 'orgdetail', element: <EmployeeOrgsDetail />, meta: { title: 'TechCorp Inc.' } },
          { path: 'claim', element: <EmployeeClaim />, meta: { title: 'Claim Payroll' } },
          { path: 'settings', navIcon: IconSettings, element: <EmployeeSettings />, meta: { title: 'Settings', subtitle: 'Manage your account settings' } }
        ]
      }
    ] as RouteItem[]
  }
]

export const router = createBrowserRouter(routes)

function findMeta(items: RouteItem[], fullPath: string): RouteItem['meta'] | undefined {
  for (const route of items) {
    if (route.path && fullPath.endsWith('/' + route.path)) {
      return route.meta
    }
    if (route.children) {
      const found = findMeta(route.children as RouteItem[], fullPath)
      if (found) return found
    }
  }
  return undefined
}

export function getRouteMeta(path: string) {
  return findMeta(routes, path)
}

/** 从路由配置动态生成 employee 侧边栏静态菜单（不含动态组织子菜单），hideInMenu 的路由自动过滤 */
export function getEmployeeNavItems(): OrgNavItem[] {
  const employeeRoute = routes.find(r => r.path === 'employee')
  const layoutRoute = employeeRoute?.children?.[0] as RouteItem | undefined
  if (!layoutRoute?.children) return []

  const result: OrgNavItem[] = []
  for (const route of layoutRoute.children as RouteItem[]) {
    if (!route.path || !route.navIcon || route.meta?.hideInMenu) continue
    result.push({
      title: route.meta?.title ?? route.path,
      key: route.path,
      url: `/employee/${route.path}`,
      icon: route.navIcon,
    })
  }
  return result
}

/** 从路由配置动态生成 orgs 侧边栏菜单，hideInMenu 的路由自动过滤 */
export function getOrgNavItems(): OrgNavItem[] {
  const orgsRoute = routes.find(r => r.path === 'orgs')
  if (!orgsRoute?.children) return []

  const result: OrgNavItem[] = []
  for (const route of orgsRoute.children as RouteItem[]) {
    if (!route.path || !route.navIcon || route.meta?.hideInMenu) continue

    const item: OrgNavItem = {
      title: route.meta?.title ?? route.path,
      key: route.path,
      url: `/orgs/${route.path}`,
      icon: route.navIcon,
    }

    // 子路由：过滤掉 index route 和 hideInMenu 的项
    const visibleChildren = (route.children as RouteItem[] | undefined)?.filter(
      c => c.path && !c.index && !c.meta?.hideInMenu
    )
    if (visibleChildren?.length) {
      item.children = visibleChildren.map(c => ({
        title: c.meta?.title ?? c.path!,
        url: `/orgs/${route.path}/${c.path}`,
      }))
    }

    result.push(item)
  }
  return result
}
