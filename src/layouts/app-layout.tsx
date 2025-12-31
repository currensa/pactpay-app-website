import AppSidebar from '@/components/app/app-sidebar'
import AppHeader from '@/components/app/app-header'
import { Outlet } from 'react-router-dom'
import { SidebarProvider } from '@/components/ui/sidebar'

export default function AppLayout() {
  return (
    <div className="flex min-h-screen">
      <SidebarProvider>
        {/* Sidebar content */}
        <AppSidebar />
        <div className="flex h-full flex-1 flex-col">
          <header className="bg-background h-16 shrink-0 border-b">
            {/* Header content */}
            <AppHeader />
          </header>
          <main className="flex-1 overflow-auto p-3">
            <Outlet />
          </main>
        </div>
      </SidebarProvider>
    </div>
  )
}
