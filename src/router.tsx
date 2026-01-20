import MemberLayout from '@/layouts/member-layout'
import OrgLayout from '@/layouts/org-layout'
import SettingLayout from '@/layouts/setting-layout'
import { lazy } from 'react'
import { createBrowserRouter, Navigate, RouteObject } from 'react-router-dom'

const Login = lazy(() => import('@/views/account/login'))
const Identity = lazy(() => import('@/views/account/identity'))
const ConnectSafeWallet = lazy(() => import('@/views/orgs/connect-safe'))
const CreateSafe = lazy(() => import('@/views/demo/create-safe'))
const ExecuteTransaction = lazy(() => import('@/views/demo/executeTransaction'))

const Overview = lazy(() => import('@/views/member/overview'))
const OrgsDetail = lazy(() => import('@/views/member/orgsdetail'))

// Settings Pages
const AccountSettings = lazy(() => import('@/views/member/settings-pages/account'))
const PreferencesSettings = lazy(() => import('@/views/member/settings-pages/preferences'))
const PrivacySettings = lazy(() => import('@/views/member/settings-pages/privacy'))

const Dashboard = lazy(() => import('@/views/orgs/dashboard'))
const Members = lazy(() => import('@/views/orgs/members'))
const CreateOrganization = lazy(() => import('@/views/orgs/create-organization'))
const Transaction = lazy(() => import('@/views/transaction/transaction'))
const Analytics = lazy(() => import('@/views/orgs/analytics'))
const Settings = lazy(() => import('@/views/orgs/settings'))
const TransactionDetail = lazy(() => import('@/views/transaction/transaction-detail'))
const TransactionDetailCopy = lazy(() => import('@/views/transaction/transaction-detail copy'))

type RouteItem = RouteObject & {
  meta?: {
    [key: string]: string | number | boolean
  }
}

const routes: RouteItem[] = [
  {
    path: 'account',
    children: [
      { path: 'login', element: <Login />, meta: { title: 'Login' } },
      { path: 'identity', element: <Identity />, meta: { title: 'Identity' } },
      { path: 'organization/create', element: <CreateOrganization />, meta: { title: 'Create Organization' } },
      { path: 'organization/connect-safe', element: <ConnectSafeWallet />, meta: { title: 'Connect Safe Wallet' } },
      { path: 'demo', element: <CreateSafe />, meta: { title: 'Create Safe Demo' } },
      { path: 'execute-transaction', element: <ExecuteTransaction />, meta: { title: 'Execute Transaction Demo' } }
    ] as RouteItem[]
  },
  {
    path: 'orgs',
    element: <OrgLayout />,
    children: [
      { index: true, element: <Navigate to="/orgs/dashboard" /> },
      { path: 'dashboard', element: <Dashboard />, meta: { title: 'Dashboard' } },
      { path: 'members', element: <Members />, meta: { title: 'Members' } },
      { path: 'transaction', element: <Transaction />, meta: { title: 'Transaction' } },
      { path: 'analytics', element: <Analytics />, meta: { title: 'Analytics' } },
      { path: 'settings', element: <Settings />, meta: { title: 'Settings' } }
    ] as RouteItem[]
  },
  { path: 'transaction/:safeTxHash', element: <TransactionDetailCopy />, meta: { title: 'Transaction Detail' } },
  {
    path: 'member',
    children: [
      {
        element: <MemberLayout />,
        children: [
          { index: true, element: <Navigate to="/member/overview" /> },
          { path: 'overview', element: <Overview />, meta: { title: 'Overview' } },
          { path: 'orgdetail', element: <OrgsDetail />, meta: { title: 'TechCorp Inc.' } }
        ]
      },
      {
        path: 'settings',
        element: <SettingLayout />,
        children: [
          { index: true, element: <Navigate to="/member/settings/account" /> },
          { path: 'account', element: <AccountSettings />, meta: { title: 'Account & Security' } },
          { path: 'preferences', element: <PreferencesSettings />, meta: { title: 'General Preferences' } },
          { path: 'privacy', element: <PrivacySettings />, meta: { title: 'Privacy & Data' } }
        ]
      }
    ] as RouteItem[]
  }
]

export const router = createBrowserRouter(routes)

export function getRouteMeta(path: string) {
  return routes.find(route => route.path === path)?.meta
}
