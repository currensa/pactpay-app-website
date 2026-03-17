import AuthChecker from '@/components/app/base/auth-checker'
import AppHeader from '@/components/app/base/app-header'
import OrgSidebar from '@/components/app/orgs/sidebar'
import useOrganizationStore from '@/stores/organization'
import { Navigate, Outlet } from 'react-router-dom'

function OrgGuard({ children }: { children: React.ReactNode }) {
  const currentOrgId = useOrganizationStore(s => s.currentOrgId)
  if (!currentOrgId) {
    return <Navigate to="/account/login" replace />
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
            <main className="flex-1 overflow-y-auto">
              <Outlet />
            </main>
          </div>
        </div>
      </OrgGuard>
    </AuthChecker>
  )
}
