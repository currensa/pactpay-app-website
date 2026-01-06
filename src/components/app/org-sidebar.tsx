import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, useSidebar } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import { IconBuildingSkyscraper } from '@tabler/icons-react'
import OrgNavMenus from './org-nav-menus'
import { NavUser } from './nav-user'
import { OrganizationSwitcher } from './org-switcher'

export default function OrgSidebar() {
  const { state } = useSidebar()

  return (
    <div>
      <Sidebar collapsible="icon">
        <div className={cn('bg-background flex h-full flex-col transition-all')}>
          <SidebarHeader>
            <OrganizationSwitcher
              organizations={[
                {
                  name: 'PactPay',
                  logo: IconBuildingSkyscraper,
                  plan: 'Free'
                }
              ]}
            />
          </SidebarHeader>
          <SidebarContent>
            <OrgNavMenus />
          </SidebarContent>
          <SidebarFooter>
            <NavUser
              user={{ name: 'John Doe', email: 'john.doe@example.com', avatar: 'https://github.com/shadcn.png' }}
            />
          </SidebarFooter>
        </div>
      </Sidebar>
    </div>
  )
}

