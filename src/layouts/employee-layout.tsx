import AppHeader from '@/components/app/base/app-header'
import AuthChecker from '@/components/app/base/auth-checker'
import EmployeeGuard from '@/components/app/base/employee-guard'
import EmployeeSidebar from '@/components/app/employee/sidebar'
import { Outlet } from 'react-router-dom'

export default function EmployeeLayout() {
  return (
    <AuthChecker>
      <EmployeeGuard>
        <div className="flex h-screen overflow-hidden bg-[#f5f5f5] gap-[24px] p-[24px]">
          <EmployeeSidebar />
          <div className="flex flex-1 flex-col min-w-0 gap-[24px] overflow-hidden">
            <AppHeader />
            <main className="flex-1 overflow-y-auto">
              <Outlet />
            </main>
          </div>
        </div>
      </EmployeeGuard>
    </AuthChecker>
  )
}
