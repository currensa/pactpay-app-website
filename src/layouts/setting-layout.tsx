import AppHeader from '@/components/app/base/app-header'
import AuthChecker from '@/components/app/base/auth-checker'
import SettingSidebar from '@/components/app/settings/sidebar'
import { SidebarProvider } from '@/components/ui/sidebar'
import { Outlet } from 'react-router-dom'

export default function SettingLayout() {
  return (
    <AuthChecker>
      <div className="flex min-h-screen">
        <SidebarProvider>
          {/* Sidebar content */}
          <SettingSidebar />
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

