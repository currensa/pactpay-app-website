import AppHeader from '@/components/app/base/app-header'
import AuthChecker from '@/components/app/base/auth-checker'
import MemberSidebar from '@/components/app/member/sidebar'
import { SidebarProvider } from '@/components/ui/sidebar'
import { Outlet } from 'react-router-dom'

export default function MemberLayout() {
  return (
    <AuthChecker>
      <div className="flex min-h-screen">
        <SidebarProvider>
          {/* Sidebar content */}
          <MemberSidebar />
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
    </AuthChecker>
  )
}
