import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import { IconBuildingSkyscraper } from '@tabler/icons-react'
import { NavUser } from '../base/nav-user'
import { OrganizationSwitcher } from '../base/switcher'
import OrgNavMenus from './nav-menus'

export default function OrgSidebar() {
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
