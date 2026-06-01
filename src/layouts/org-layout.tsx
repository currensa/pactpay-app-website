import AppHeader from '@/components/app/base/app-header'
import AuthChecker from '@/components/app/base/auth-checker'
import OrgSidebar from '@/components/app/orgs/sidebar'
import useOrganizationStore from '@/stores/organization'
import { Permission, useHasPermission } from '@/utils/permissions'
import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

function OrgGuard({ children }: { children: React.ReactNode }) {
  const currentOrgId = useOrganizationStore(s => s.currentOrgId)
  const hasPermission = useHasPermission()
  const location = useLocation()

  if (!currentOrgId) {
    return <Navigate to="/welcome" replace />
  }
  if (location.pathname.startsWith('/orgs/settings') && !hasPermission(Permission.MODIFY_ORG_NETWORK)) {
    return <Navigate to="/orgs/dashboard" replace />
  }
  return <>{children}</>
}

export default function OrgLayout() {
  const currentOrgId = useOrganizationStore(s => s.currentOrgId)
  const fetchPayrollTokenSymbol = useOrganizationStore(s => s.fetchPayrollTokenSymbol)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  useEffect(() => {
    if (!currentOrgId) return
    void fetchPayrollTokenSymbol().catch(() => {
      // request interceptor handles API errors
    })
  }, [currentOrgId, fetchPayrollTokenSymbol])

  return (
    <AuthChecker>
      <OrgGuard>
        <div className="flex min-h-dvh bg-[#f5f5f5] p-[12px] md:h-screen md:overflow-hidden md:gap-[24px] md:p-[24px]">
          <OrgSidebar mobileOpen={mobileSidebarOpen} onMobileOpenChange={setMobileSidebarOpen} />
          <div className="flex min-w-0 flex-1 flex-col gap-[12px] md:gap-[24px] md:overflow-hidden">
            <AppHeader onMenuClick={() => setMobileSidebarOpen(true)} />
            <main className="flex-1 overflow-y-auto">
              <Outlet />
            </main>
          </div>
        </div>
      </OrgGuard>
    </AuthChecker>
  )
}
