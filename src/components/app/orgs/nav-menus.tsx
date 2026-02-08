import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import {
  IconBook,
  IconCashMove,
  IconHelpCircle,
  IconLayoutDashboard,
  IconSettings,
  IconShield,
  // IconBuildingSkyscraper,
  IconUsers
} from '@tabler/icons-react'
import { useLocation, useNavigate } from 'react-router-dom'

interface MenuItem {
  title: string
  key: string
  url: string
  icon?: React.ForwardRefExoticComponent<React.SVGProps<SVGSVGElement> & React.RefAttributes<SVGSVGElement>>
  items?: {
    title: string
    url: string
  }[]
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
    title: 'Role Management',
    key: 'roles',
    url: '/orgs/roles',
    icon: IconShield
  },
  // {
  //   title: 'Analytics',
  //   key: 'analytics',
  //   url: '/orgs/analytics',
  //   icon: IconAnalyze
  // },
  {
    title: 'Settings',
    key: 'settings',
    url: '/orgs/settings',
    icon: IconSettings,
    items: [
      {
        title: 'Payment',
        url: '/orgs/settings/payment'
      },
      {
        title: 'Organization',
        url: '/orgs/settings/organization'
      }
    ]
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
  const location = useLocation()

  function handleSidebarMenuClick(menu: MenuItem) {
    navigate(menu.url)
  }

  const isRouteActive = (url: string) => {
    return location.pathname === url || location.pathname.startsWith(url + '/')
  }

  return (
    <>
      <SidebarGroup>
        {/* <SidebarGroupLabel className="text-muted-foreground/60">Menu</SidebarGroupLabel> */}
        <SidebarGroupContent>
          <SidebarMenu>
            {NavMainItems.map(item => {
              const isActive = isRouteActive(item.url)
              return (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    tooltip={item.title}
                    onClick={() => handleSidebarMenuClick(item)}
                    isActive={isActive}
                    className={cn('transition-all', !isActive && 'text-muted-foreground/70')}
                  >
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                  {item.items?.length && (
                    <SidebarMenuSub>
                      {item.items.map(subItem => (
                        <SidebarMenuSubItem key={subItem.url}>
                          <SidebarMenuSubButton
                            isActive={location.pathname === subItem.url}
                            onClick={() => navigate(subItem.url)}
                            className={cn('cursor-pointer', location.pathname !== subItem.url && 'text-muted-foreground/70')}
                          >
                            <span>{subItem.title}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  )}
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
            {/* {NavSecondaryItems.map(item => {
              const isActive = isRouteActive(item.url)
              return (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    tooltip={item.title}
                    onClick={() => handleSidebarMenuClick(item)}
                    isActive={isActive}
                    className={cn('transition-all', !isActive && 'text-muted-foreground/70')}
                  >
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })} */}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  )
}
