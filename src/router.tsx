import MemberLayout from '@/layouts/member-layout'
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

const MemberDashboard = lazy(() => import('@/views/member/dashboard'))
const MemberOrgsDetail = lazy(() => import('@/views/member/orgsdetail'))
const MemberClaim = lazy(() => import('@/views/member/claim'))
const MemberSettings = lazy(() => import('@/views/member/settings'))

const Dashboard = lazy(() => import('@/views/orgs/dashboard'))
const Members = lazy(() => import('@/views/orgs/members'))
const Transaction = lazy(() => import('@/views/transaction/transaction'))
const CreateTransaction = lazy(() => import('@/views/transaction/create-transaction'))
const Analytics = lazy(() => import('@/views/orgs/analytics'))
const OrganizationSettings = lazy(() => import('@/views/orgs/settings/organization'))
const RoleManagement = lazy(() => import('@/views/orgs/roles'))
const TransactionDetailPage = lazy(() => import('@/views/transaction/transaction-detail'))

type RouteItem = RouteObject & {
  meta?: {
    title?: string
    subtitle?: string
    /** 在侧边栏菜单中隐藏该项 */
    hideInMenu?: boolean
    [key: string]: string | number | boolean | undefined
  }
  // (backUrl is managed via useHeaderStore, not meta — kept for reference)
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
      { path: 'transaction/create', element: <CreateTransaction />, meta: { title: 'Create New Transaction', hideInMenu: true } },
      { path: 'transaction/:id', element: <TransactionDetailPage />, meta: { title: 'Transaction Detail', hideInMenu: true } },
      { path: 'analytics', navIcon: IconAlignBoxBottomRight, element: <Analytics />, meta: { title: 'Analytics', subtitle: 'Track your payment analytics', hideInMenu: false } },
      {
        path: 'settings',
        navIcon: IconSettings,
        element: <OrganizationSettings />,
        meta: { title: 'Settings', subtitle: 'Manage your organization settings' }
      }
    ] as RouteItem[]
  },
  {
    path: 'member',
    children: [
      {
        element: <MemberLayout />,
        children: [
          { index: true, element: <Navigate to="member/dashboard" /> },
          { path: 'dashboard', navIcon: IconLayoutDashboard, element: <MemberDashboard />, meta: { title: 'Dashboard', subtitle: "Monitor your organization's key metrics and activities" } },
          { path: 'orgdetail', element: <MemberOrgsDetail />, meta: { title: 'TechCorp Inc.' } },
          { path: 'claim', element: <MemberClaim />, meta: { title: 'Claim', subtitle: 'Merge claim: all pending funds in one transaction. Gas is paid by the platform.' } },
          { path: 'settings', navIcon: IconSettings, element: <MemberSettings />, meta: { title: 'Settings', subtitle: 'Manage your account settings' } }
        ]
      }
    ] as RouteItem[]
  }
]

export const router = createBrowserRouter(routes)

/** Convert a route pattern like "transaction/:id" to a regex that matches real paths */
function routePatternToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const withParams = escaped.replace(/:[\w]+/g, '[^/]+')
  return new RegExp('(^|/)' + withParams + '$')
}

function findMeta(items: RouteItem[], fullPath: string): RouteItem['meta'] | undefined {
  for (const route of items) {
    if (route.path) {
      const pattern = routePatternToRegex(route.path)
      if (pattern.test(fullPath)) {
        return route.meta
      }
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

/** 从路由配置动态生成 member 侧边栏静态菜单（不含动态组织子菜单），hideInMenu 的路由自动过滤 */
export function getMemberNavItems(): OrgNavItem[] {
  const memberRoute = routes.find(r => r.path === 'member')
  const layoutRoute = memberRoute?.children?.[0] as RouteItem | undefined
  if (!layoutRoute?.children) return []

  const result: OrgNavItem[] = []
  for (const route of layoutRoute.children as RouteItem[]) {
    if (!route.path || !route.navIcon || route.meta?.hideInMenu) continue
    result.push({
      title: route.meta?.title ?? route.path,
      key: route.path,
      url: `/member/${route.path}`,
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
