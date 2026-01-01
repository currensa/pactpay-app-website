import AppHeader from '@/components/app/app-header'
import AppSidebar from '@/components/app/app-sidebar'
import AuthChecker from '@/components/app/auth-checker'
import { SidebarProvider } from '@/components/ui/sidebar'
import { Outlet } from 'react-router-dom'

export default function AppLayout() {
  return (
    <AuthChecker>
      <div className="flex min-h-screen">
        <SidebarProvider>
          {/* Sidebar content */}
          <AppSidebar />
          <div className="flex h-full flex-1 flex-col">
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
