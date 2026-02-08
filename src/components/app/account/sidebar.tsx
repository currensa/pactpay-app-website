import { Sidebar, SidebarContent, SidebarHeader, useSidebar } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import { IconArrowLeft } from '@tabler/icons-react'
import { useLocation, useNavigate } from 'react-router-dom'
import AccountNavMenus from './nav-menus'

export default function AccountSidebar() {
  const { state } = useSidebar()
  const navigate = useNavigate()
  const location = useLocation()

  const handleBack = () => {
    const from = location.state?.from
    if (from) {
      navigate(from)
    } else {
      navigate(-1)
    }
  }

  return (
    <div>
      <Sidebar collapsible="icon">
        <div className={cn('bg-background flex h-full flex-col transition-all')}>
          <SidebarHeader className="h-16 flex justify-center border-b px-4">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              <IconArrowLeft className="h-4 w-4" />
              {state === 'expanded' && <span>Back</span>}
            </button>
          </SidebarHeader>
          <SidebarContent className="pt-4">
            <AccountNavMenus />
          </SidebarContent>
        </div>
      </Sidebar>
    </div>
  )
}

