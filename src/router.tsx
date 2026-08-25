import type { I18nKey } from '@/i18n/messages'
import AccountLayout from '@/layouts/account-layout'
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
  titleKey?: I18nKey
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
  titleKey?: I18nKey
  key: string
  url: string
  icon: React.ElementType
  children?: OrgNavChild[]
}

const HomeLayout = lazy(() => import('@/views/home/home-layout'))
const HomeContent = lazy(() => import('@/views/home/home-content'))
const PricingPage = lazy(() => import('@/views/home/pricing'))
const DocumentPage = lazy(() => import('@/views/home/document'))
const TestingPage = lazy(() => import('@/views/home/testing'))
const TermsPage = lazy(() => import('@/views/home/terms'))
const PrivacyPage = lazy(() => import('@/views/home/privacy'))

const Login = lazy(() => import('@/views/account/login'))
const McpAuthPage = lazy(() => import('@/views/account/mcp-auth'))
const AccountSettings = lazy(() => import('@/views/account/settings/account'))
const WelcomeStep = lazy(() => import('@/views/account/steps/welcome-step'))
const SignInStep = lazy(() => import('@/views/account/steps/sign-in-step'))
const IdentityStep = lazy(() => import('@/views/account/steps/identity-step'))
const SelectOrgStep = lazy(() => import('@/views/account/steps/select-org-step'))
const CreateOrgStep = lazy(() => import('@/views/account/steps/create-org-step'))
const JoinOrgStep = lazy(() => import('@/views/account/steps/join-org-step'))
const BindWalletStep = lazy(() => import('@/views/account/steps/bind-wallet-step'))
const JoinInvite = lazy(() => import('@/views/account/join-invite'))

const MemberDashboard = lazy(() => import('@/views/member/dashboard'))
const MemberOrgsDetail = lazy(() => import('@/views/member/orgsdetail'))
const MemberClaim = lazy(() => import('@/views/member/claim'))
const MemberSettings = lazy(() => import('@/views/member/settings'))
const NotificationsPage = lazy(() => import('@/views/notifications'))

const Dashboard = lazy(() => import('@/views/orgs/dashboard'))
const Members = lazy(() => import('@/views/orgs/members'))
const TokenUsagePlanDetailPage = lazy(() => import('@/views/orgs/token-usage-plan-detail'))
const Transaction = lazy(() => import('@/views/transaction/transaction'))
const CreateTransactionSelector = lazy(() => import('@/views/transaction/create-transaction-selector'))
const CreateTransaction = lazy(() => import('@/views/transaction/create-transaction'))
const CreateAiTransaction = lazy(() => import('@/views/transaction/create-ai-transaction'))
const Analytics = lazy(() => import('@/views/orgs/analytics'))
const OrganizationSettings = lazy(() => import('@/views/orgs/settings/organization'))
const TransactionDetailPage = lazy(() => import('@/views/transaction/transaction-detail'))

type RouteItem = RouteObject & {
  meta?: {
    title?: string
    subtitle?: string
    titleKey?: I18nKey
    subtitleKey?: I18nKey
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
    path: '/',
    element: <HomeLayout />,
    children: [
      { index: true, element: <HomeContent /> },
      { path: 'pricing', element: <PricingPage /> },
      { path: 'document', element: <DocumentPage /> },
    ]
  },
  {
    path: 'testing',
    element: <TestingPage />,
  },
  {
    path: 'legal/terms',
    element: <TermsPage />,
  },
  {
    path: 'legal/privacy',
    element: <PrivacyPage />,
  },
  {
    path: 'join/:code',
    element: <JoinInvite />,
  },
  {
    path: 'account',
    element: <AccountLayout />,
    children: [
      { index: true, element: <Navigate to="/account/settings/account" replace /> },
      {
        path: 'settings/account',
        element: <AccountSettings />,
        meta: { title: 'Account & Security', titleKey: 'nav.accountSecurity', subtitle: 'Manage your account and API keys', subtitleKey: 'route.accountSettingsSubtitle' }
      },
    ]
  },
  {
    path: 'mcp-auth',
    element: <Login />,
    children: [
      { index: true, element: <McpAuthPage /> },
    ]
  },
  {
    path: 'welcome',
    element: <Login />,
    children: [
      { index: true, element: <WelcomeStep /> },
      { path: 'sign-in', element: <SignInStep /> },
      { path: 'identity', element: <IdentityStep /> },
      { path: 'select-org', element: <SelectOrgStep /> },
      { path: 'create-org', element: <CreateOrgStep /> },
      { path: 'join-org', element: <JoinOrgStep /> },
      { path: 'bind-wallet', element: <BindWalletStep /> },
    ]
  },
  {
    path: 'orgs',
    element: <OrgLayout />,
    children: [
      { index: true, element: <Navigate to="/orgs/dashboard" /> },
      { path: 'dashboard', navIcon: IconLayoutDashboard, element: <Dashboard />, meta: { title: 'Dashboard', titleKey: 'route.dashboard', subtitle: "Monitor your organization's key metrics and activities", subtitleKey: 'route.dashboardSubtitle' } },
      { path: 'members', navIcon: IconUsers, element: <Members />, meta: { title: 'Payees', titleKey: 'route.payees', subtitle: 'Manage people and services your organisation pays', subtitleKey: 'route.payeesSubtitle' } },
      { path: 'members/usage-plans/:id', element: <TokenUsagePlanDetailPage />, meta: { title: 'Usage Plan', titleKey: 'route.usagePlan', hideInMenu: true } },
      // { path: 'roles', navIcon: IconShield, element: <RoleManagement />, meta: { title: 'Role Management' } },
      { path: 'transaction', navIcon: IconCashMove, element: <Transaction />, meta: { title: 'Transactions', titleKey: 'route.transactions', subtitle: 'View and manage payment transactions', subtitleKey: 'route.transactionsSubtitle' } },
      { path: 'transaction/create', element: <CreateTransactionSelector />, meta: { title: 'Create New Transaction', titleKey: 'route.createTransaction', hideInMenu: true } },
      { path: 'transaction/create-people', element: <CreateTransaction />, meta: { title: 'Create New Transaction', titleKey: 'route.createTransaction', hideInMenu: true } },
      { path: 'transaction/create-ai', element: <CreateAiTransaction />, meta: { title: 'New AI API Top Up', titleKey: 'route.createAiTopUp', hideInMenu: true } },
      { path: 'transaction/:id', element: <TransactionDetailPage />, meta: { title: 'Transaction Detail', titleKey: 'route.transactionDetail', hideInMenu: true } },
      { path: 'analytics', navIcon: IconAlignBoxBottomRight, element: <Analytics />, meta: { title: 'Analytics', titleKey: 'route.analytics', subtitle: 'Track your payment analytics', subtitleKey: 'route.analyticsSubtitle', hideInMenu: false } },
      { path: 'notifications', element: <NotificationsPage />, meta: { title: 'Notifications', titleKey: 'route.notifications', subtitle: 'Showing notifications for Engineering Team', subtitleKey: 'route.notificationsSubtitle', hideInMenu: true } },
      {
        path: 'settings',
        navIcon: IconSettings,
        element: <OrganizationSettings />,
        meta: { title: 'Settings', titleKey: 'route.settings', subtitle: 'Manage your organization settings', subtitleKey: 'route.orgSettingsSubtitle' }
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
          { path: 'dashboard', navIcon: IconLayoutDashboard, element: <MemberDashboard />, meta: { title: 'Dashboard', titleKey: 'route.dashboard', subtitle: "Monitor your organization's key metrics and activities", subtitleKey: 'route.dashboardSubtitle' } },
          { path: 'orgdetail', element: <MemberOrgsDetail />, meta: { title: 'TechCorp Inc.', titleKey: 'route.memberOrgDetail' } },
          { path: 'claim', element: <MemberClaim />, meta: { title: 'Claim', titleKey: 'route.claim', subtitle: 'Merge claim: all pending funds in one transaction. Gas is paid by the platform.', subtitleKey: 'route.claimSubtitle' } },
          { path: 'notifications', element: <NotificationsPage />, meta: { title: 'Notifications', titleKey: 'route.notifications', subtitle: 'Showing notifications for Engineering Team', subtitleKey: 'route.notificationsSubtitle', hideInMenu: true } },
          { path: 'settings', navIcon: IconSettings, element: <MemberSettings />, meta: { title: 'Settings', titleKey: 'route.settings', subtitle: 'Manage your account settings', subtitleKey: 'route.memberSettingsSubtitle' } }
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
      titleKey: route.meta?.titleKey,
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
      titleKey: route.meta?.titleKey,
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
        titleKey: c.meta?.titleKey,
        url: `/orgs/${route.path}/${c.path}`,
      }))
    }

    result.push(item)
  }
  return result
}
