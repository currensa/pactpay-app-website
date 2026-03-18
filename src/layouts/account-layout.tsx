import AppHeader from '@/components/app/base/app-header'
import AuthChecker from '@/components/app/base/auth-checker'
import AccountSidebar from '@/components/app/account/sidebar'
import { SidebarProvider } from '@/components/ui/sidebar'
import { Outlet } from 'react-router-dom'

export default function AccountLayout() {
  return (
    <AuthChecker>
      <div className="flex min-h-screen">
        <SidebarProvider>
          {/* Sidebar content */}
          <AccountSidebar />
          <div className="flex h-full flex-1 flex-col overflow-hidden">
            {/* Reuse AppHeader for consistency */}
            <AppHeader />
            <main className="flex-1 overflow-auto px-3 py-4">
              <Outlet />
            </main>
          </div>
        </SidebarProvider>
      </div>
    </AuthChecker>
  )
}
