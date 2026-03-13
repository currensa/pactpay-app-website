import AccountLayout from '@/layouts/account-layout'
import EmployeeLayout from '@/layouts/employee-layout'
import OrgLayout from '@/layouts/org-layout'
import { lazy } from 'react'
import { createBrowserRouter, Navigate, RouteObject } from 'react-router-dom'

const Login = lazy(() => import('@/views/account/login'))

const EmployeeOverview = lazy(() => import('@/views/employee/overview'))
const EmployeeOrgsDetail = lazy(() => import('@/views/employee/orgsdetail'))
const EmployeeClaim = lazy(() => import('@/views/employee/claim'))

// Settings Pages
const AccountSettings = lazy(() => import('@/views/account/settings/account'))
const PreferencesSettings = lazy(() => import('@/views/account/settings/preferences'))
const PrivacySettings = lazy(() => import('@/views/account/settings/privacy'))

const Dashboard = lazy(() => import('@/views/orgs/dashboard'))
const Members = lazy(() => import('@/views/orgs/members'))
const CreateOrganization = lazy(() => import('@/views/orgs/create-organization'))
const Transaction = lazy(() => import('@/views/transaction/transaction'))
const CreateTransaction = lazy(() => import('@/views/transaction/create-transaction'))
const Analytics = lazy(() => import('@/views/orgs/analytics'))
const PaymentSettings = lazy(() => import('@/views/orgs/settings/payment'))
const OrganizationSettings = lazy(() => import('@/views/orgs/settings/organization'))
const RoleManagement = lazy(() => import('@/views/orgs/roles'))
const TransactionDetail = lazy(() => import('@/views/transaction/transaction-detail'))

type RouteItem = RouteObject & {
  meta?: {
    [key: string]: string | number | boolean
  }
}

const routes: RouteItem[] = [
  {
    index: true, element: <Navigate to="/account/login" />
  },
  {
    path: 'account',
    children: [
      { path: 'login', element: <Login />, meta: { title: 'Login' } },
      { path: 'organization/create', element: <CreateOrganization />, meta: { title: 'Create Organization' } },
      {
        path: 'settings',
        element: <AccountLayout />,
        children: [
          { index: true, element: <Navigate to="/account/settings/account" replace /> },
          { path: 'account', element: <AccountSettings />, meta: { title: 'Account & Security' } },
          { path: 'preferences', element: <PreferencesSettings />, meta: { title: 'General Preferences' } },
          { path: 'privacy', element: <PrivacySettings />, meta: { title: 'Privacy & Data' } }
        ]
      }
    ] as RouteItem[]
  },
  {
    path: 'orgs',
    element: <OrgLayout />,
    children: [
      { index: true, element: <Navigate to="/orgs/dashboard" /> },
      { path: 'dashboard', element: <Dashboard />, meta: { title: 'Dashboard' } },
      { path: 'members', element: <Members />, meta: { title: 'Members' } },
      { path: 'roles', element: <RoleManagement />, meta: { title: 'Role Management' } },
      { path: 'transaction', element: <Transaction />, meta: { title: 'Transaction' } },
      { path: 'transaction/create', element: <CreateTransaction />, meta: { title: 'Create Transaction' } },
      { path: 'analytics', element: <Analytics />, meta: { title: 'Analytics' } },
      {
        path: 'settings',
        children: [
          { index: true, element: <Navigate to="/orgs/settings/payment" replace /> },
          { path: 'payment', element: <PaymentSettings />, meta: { title: 'Payment Settings' } },
          { path: 'organization', element: <OrganizationSettings />, meta: { title: 'Organization Settings' } }
        ]
      }
    ] as RouteItem[]
  },
  { path: 'transaction/:batchId', element: <TransactionDetail />, meta: { title: 'Transaction Detail' } },
  {
    path: 'employee',
    children: [
      {
        element: <EmployeeLayout />,
        children: [
          { index: true, element: <Navigate to="/employee/overview" /> },
          { path: 'overview', element: <EmployeeOverview />, meta: { title: 'Overview' } },
          { path: 'orgdetail', element: <EmployeeOrgsDetail />, meta: { title: 'TechCorp Inc.' } },
          { path: 'claim', element: <EmployeeClaim />, meta: { title: 'Claim Payroll' } }
        ]
      }
    ] as RouteItem[]
  }
]

export const router = createBrowserRouter(routes)

export function getRouteMeta(path: string) {
  return routes.find(route => route.path === path)?.meta
}
