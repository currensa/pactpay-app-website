import AppHeader from '@/components/app/base/app-header'
import AuthChecker from '@/components/app/base/auth-checker'
import OrgSidebar from '@/components/app/orgs/sidebar'
import useOrganizationStore from '@/stores/organization'
import { Permission, useHasPermission } from '@/utils/permissions'
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
  return (
    <AuthChecker>
      <OrgGuard>
        <div className="flex h-screen overflow-hidden bg-[#f5f5f5] gap-[24px] p-[24px]">
          <OrgSidebar />
          <div className="flex flex-1 flex-col min-w-0 gap-[24px] overflow-hidden">
            <AppHeader />
            <main className="flex-1 ">
              <Outlet />
            </main>
          </div>
        </div>
      </OrgGuard>
    </AuthChecker>
  )
}
