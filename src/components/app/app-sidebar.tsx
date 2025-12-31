import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from '@/components/ui/sidebar'
import { NavUser } from './nav-user'
import {
  IconLayoutDashboard,
  IconBuildingSkyscraper,
  IconSettings,
  IconAnalyze,
  IconCashMove
} from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { useLocation, useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@radix-ui/react-avatar'

interface MenuItem {
  title: string
  key: string
  url: string
  icon: React.ForwardRefExoticComponent<React.SVGProps<SVGSVGElement> & React.RefAttributes<SVGSVGElement>>
}

const menuItems: MenuItem[] = [
  {
    title: 'Overview',
    key: 'dashboard',
    url: '/dashboard',
    icon: IconLayoutDashboard
  },
  {
    title: 'Organization',
    key: 'organization',
    url: '/organization',
    icon: IconBuildingSkyscraper
  },
  {
    title: 'Transactions',
    key: 'transaction',
    url: '/transaction',
    icon: IconCashMove
  },
  {
    title: 'Analytics',
    key: 'analytics',
    url: '/analytics',
    icon: IconAnalyze
  },
  {
    title: 'Payment Settings',
    key: 'settings',
    url: '/settings',
    icon: IconSettings
  }
]

function SidebarMenuItems() {
  const [activeKey, setActiveKey] = useState<string>()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const activeItem = menuItems.find((item) => item.url === location.pathname)
    if (activeItem) {
      setActiveKey(activeItem.key)
    }
  }, [location])

  function handleSidebarMenuClick(menu: MenuItem) {
    setActiveKey(menu.key)
    navigate(menu.url)
  }

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.key}>
              <SidebarMenuButton
                tooltip={item.title}
                onClick={() => handleSidebarMenuClick(item)}
                className={cn(
                  'transition-all',
                  activeKey === item.key ? 'bg-primary! text-primary-foreground!' : 'text-foreground bg-transparent'
                )}
              >
                {item.icon && <item.icon />}
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

function AppSidebarHeader() {
  return (
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg">
            <Avatar className="size-8 rounded-lg">
              <AvatarImage />
              <AvatarFallback className="flex size-8 items-center justify-center rounded-full bg-[blue] text-white">
                PP
              </AvatarFallback>
            </Avatar>
            <div className="text-base font-semibold whitespace-nowrap">PactPay Inc.</div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
  )
}

export default function AppSidebar() {
  const { state } = useSidebar()

  return (
    <div>
      <Sidebar collapsible="icon">
        <div className={cn('flex h-full flex-col transition-all', state === 'collapsed' ? 'px-0 py-2' : 'px-2 py-0')}>
          <AppSidebarHeader />
          <SidebarContent>
            <SidebarMenuItems />
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
