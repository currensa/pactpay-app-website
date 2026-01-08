import { Sidebar, SidebarContent, SidebarHeader, useSidebar } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import { IconArrowLeft } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import SettingNavMenus from './nav-menus'

export default function SettingSidebar() {
  const { state } = useSidebar()
  const navigate = useNavigate()

  return (
    <div>
      <Sidebar collapsible="icon">
        <div className={cn('bg-background flex h-full flex-col transition-all')}>
          <SidebarHeader className="h-16 flex justify-center border-b px-4">
            <button
              onClick={() => navigate('/member/overview')}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              <IconArrowLeft className="h-4 w-4" />
              {state === 'expanded' && <span>Back to Member</span>}
            </button>
          </SidebarHeader>
          <SidebarContent className="pt-4">
            <SettingNavMenus />
          </SidebarContent>
        </div>
      </Sidebar>
    </div>
  )
}

