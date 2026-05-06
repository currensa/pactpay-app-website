import AppHeader from '@/components/app/base/app-header'
import AuthChecker from '@/components/app/base/auth-checker'
import MemberGuard from '@/components/app/base/member-guard'
import MemberSidebar from '@/components/app/member/sidebar'
import { Outlet } from 'react-router-dom'

export default function MemberLayout() {
  return (
    <AuthChecker>
      <MemberGuard>
        <div className="flex h-screen overflow-hidden bg-[#f5f5f5] gap-[24px] p-[24px]">
          <MemberSidebar />
          <div className="flex flex-1 flex-col min-w-0 gap-[24px] overflow-hidden">
            <AppHeader />
            <main className="flex-1">
              <Outlet />
            </main>
          </div>
        </div>
      </MemberGuard>
    </AuthChecker>
  )
}
