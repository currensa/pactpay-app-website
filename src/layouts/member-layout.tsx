import AppHeader from '@/components/app/base/app-header'
import AuthChecker from '@/components/app/base/auth-checker'
import MemberGuard from '@/components/app/base/member-guard'
import MemberSidebar from '@/components/app/member/sidebar'
import { useState } from 'react'
import { Outlet } from 'react-router-dom'

export default function MemberLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
    <AuthChecker>
      <MemberGuard>
        <div className="flex min-h-dvh bg-[#f5f5f5] p-[12px] md:h-screen md:overflow-hidden md:gap-[24px] md:p-[24px]">
          <MemberSidebar mobileOpen={mobileSidebarOpen} onMobileOpenChange={setMobileSidebarOpen} />
          <div className="flex min-w-0 flex-1 flex-col gap-[12px] md:gap-[24px] md:overflow-hidden">
            <AppHeader onMenuClick={() => setMobileSidebarOpen(true)} />
            <main className="flex-1 overflow-y-auto">
              <Outlet />
            </main>
          </div>
        </div>
      </MemberGuard>
    </AuthChecker>
  )
}
