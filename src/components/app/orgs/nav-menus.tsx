import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'
import {
  IconAnalyze,
  IconBook,
  IconCashMove,
  IconHelpCircle,
  IconLayoutDashboard,
  IconSettings,
  // IconBuildingSkyscraper,
  IconUsers
} from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'

interface MenuItem {
  title: string
  key: string
  url: string
  icon: React.ForwardRefExoticComponent<React.SVGProps<SVGSVGElement> & React.RefAttributes<SVGSVGElement>>
}

const NavMainItems: MenuItem[] = [
  {
    title: 'Dashboard',
    key: 'dashboard',
    url: '/orgs/dashboard',
    icon: IconLayoutDashboard
  },
  {
    title: 'Members',
    key: 'members',
    url: '/orgs/members',
    icon: IconUsers
  },
  {
    title: 'Transactions',
    key: 'transaction',
    url: '/orgs/transaction',
    icon: IconCashMove
  },
  {
    title: 'Analytics',
    key: 'analytics',
    url: '/orgs/analytics',
    icon: IconAnalyze
  },
  {
    title: 'Payment Settings',
    key: 'settings',
    url: '/orgs/settings',
    icon: IconSettings
  }
]

const NavSecondaryItems: MenuItem[] = [
  {
    title: 'Document',
    key: 'documentation',
    url: 'https://docs.pactpay.com',
    icon: IconBook
  },
  {
    title: 'Help',
    key: 'help',
    url: '/help',
    icon: IconHelpCircle
  }
]

export default function OrgNavMenus() {
  const navigate = useNavigate()

  function handleSidebarMenuClick(menu: MenuItem) {
    navigate(menu.url)
  }

  return (
    <>
      <SidebarGroup>
        {/* <SidebarGroupLabel className="text-muted-foreground/60">Menu</SidebarGroupLabel> */}
        <SidebarGroupContent>
          <SidebarMenu>
            {NavMainItems.map(item => {
              return (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    tooltip={item.title}
                    onClick={() => handleSidebarMenuClick(item)}
                    className="transition-all"
                  >
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      <SidebarGroup className="mt-auto">
        {/* <SidebarGroupLabel className="text-muted-foreground/60">Menu</SidebarGroupLabel> */}
        <SidebarGroupContent>
          <SidebarMenu>
            {NavSecondaryItems.map(item => (
              <SidebarMenuItem key={item.key}>
                <SidebarMenuButton
                  tooltip={item.title}
                  onClick={() => handleSidebarMenuClick(item)}
                  className="transition-all"
                >
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  )
}
