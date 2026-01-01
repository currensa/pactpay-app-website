import Layout from '@/layouts/app-layout'
import Login from '@/views/login'
import { lazy } from 'react'
import { createBrowserRouter, Navigate, RouteObject } from 'react-router-dom'

const Dashboard = lazy(() => import('@/views/orgs/dashboard'))
const Organization = lazy(() => import('@/views/orgs/organization'))
const Transaction = lazy(() => import('@/views/orgs/transaction'))
const Analytics = lazy(() => import('@/views/orgs/analytics'))
const Settings = lazy(() => import('@/views/orgs/settings'))

type RouteItem = RouteObject & {
  meta?: {
    [key: string]: string | number | boolean
  }
}

const routes: RouteItem[] = [
  { path: '/account/login', element: <Login />, meta: { title: 'Login' } },
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" /> },
      { path: 'dashboard', element: <Dashboard />, meta: { title: 'Dashboard' } },
      { path: 'organization', element: <Organization />, meta: { title: 'Organization' } },
      { path: 'transaction', element: <Transaction />, meta: { title: 'Transaction' } },
      { path: 'analytics', element: <Analytics />, meta: { title: 'Analytics' } },
      { path: 'settings', element: <Settings />, meta: { title: 'Settings' } }
    ] as RouteItem[]
  }
]

export const router = createBrowserRouter(routes)

export function getRouteMeta(path: string) {
  return routes.find(route => route.path === path)?.meta
}

/**
 * Get the breadcrumb titles for a given path.
 * Returns an array of titles from root to the target route.
 */
export function getRouteBreadcrumb(path: string): (string | undefined)[] {
  function findTitles(
    routesList: RouteItem[],
    segments: string[],
    accumulatedPath: string = ''
  ): { titles: (string | undefined)[]; found: boolean } {
    for (const route of routesList) {
      let routePath = route.path?.replace(/\/$/, '') || ''
      let routeSegments = routePath.startsWith('/') ? routePath.slice(1).split('/') : routePath.split('/')
      if (routePath === '' && accumulatedPath === '') routeSegments = []

      const currentSegments = segments.slice(0, routeSegments.length)

      const matched = routeSegments.every((seg, idx) => {
        if (!seg) return !currentSegments[idx]
        return seg.startsWith(':') || seg === currentSegments[idx]
      })

      if (matched && (routeSegments.length > 0 || route.path === '')) {
        if (route.children && route.children.length > 0 && currentSegments.length < segments.length) {
          const nextSegments = segments.slice(routeSegments.length)
          const result = findTitles(route.children as RouteItem[], nextSegments)
          if (result.found) {
            return {
              titles: [route.meta?.title as string | undefined, ...result.titles],
              found: true
            }
          }
        }

        if (currentSegments.length === segments.length) {
          return {
            titles: [route.meta?.title as string | undefined],
            found: true
          }
        }
      }
    }
    return { titles: [], found: false }
  }

  const segments = path.replace(/^\//, '').split('/').filter(Boolean)

  if (path === '/' || segments.length === 0) {
    const rootRoute = routes.find(r => r.path === '/')
    return rootRoute?.meta?.title ? [rootRoute.meta.title as string] : []
  }

  const { titles } = findTitles(routes, segments)
  return titles
}
