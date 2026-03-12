import AppHeader from '@/components/app/base/app-header'
import AuthChecker from '@/components/app/base/auth-checker'
import OrgSidebar from '@/components/app/orgs/sidebar'
import useOrganizationStore from '@/stores/organization'
import { SidebarProvider } from '@/components/ui/sidebar'
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
        <div className="flex min-h-screen">
          <SidebarProvider>
            {/* Sidebar content */}
            <OrgSidebar />
            <div className="flex h-full flex-1 flex-col overflow-hidden">
              <header className="bg-background h-16 shrink-0 border-b">
                {/* Header content */}
                <AppHeader />
              </header>
              <main className="flex-1 overflow-auto px-3 py-4">
                <Outlet />
              </main>
            </div>
          </SidebarProvider>
        </div>
      </OrgGuard>
    </AuthChecker>
  )
}
