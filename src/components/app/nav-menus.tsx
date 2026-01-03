import { cn } from '@/lib/utils'
import {
  IconAnalyze,
  IconBook,
  IconBuildingSkyscraper,
  IconCashMove,
  IconHelpCircle,
  IconLayoutDashboard,
  IconSettings
} from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '../ui/sidebar'

interface MenuItem {
  title: string
  key: string
  url: string
  icon: React.ForwardRefExoticComponent<React.SVGProps<SVGSVGElement> & React.RefAttributes<SVGSVGElement>>
}

const NavMainItems: MenuItem[] = [
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

export default function NavMenus() {
  // const [activeKey, setActiveKey] = useState<string>()
  // const location = useLocation()
  const navigate = useNavigate()

  // useEffect(() => {
  //   const activeItem = menuItems.find(item => item.url === location.pathname)
  //   if (activeItem) {
  //     setActiveKey(activeItem.key)
  //   }
  // }, [location])

  function handleSidebarMenuClick(menu: MenuItem) {
    // setActiveKey(menu.key)
    navigate(menu.url)
  }

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel className="text-muted-foreground/60">Menu</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {NavMainItems.map(item => (
              <SidebarMenuItem key={item.key}>
                <SidebarMenuButton
                  tooltip={item.title}
                  onClick={() => handleSidebarMenuClick(item)}
                  className={cn(
                    'transition-all'
                    // activeKey === item.key ? 'bg-primary! text-primary-foreground!' : 'text-foreground bg-transparent'
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
      <SidebarGroup className="mt-auto">
        <SidebarGroupLabel className="text-muted-foreground/60">Menu</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {NavSecondaryItems.map(item => (
              <SidebarMenuItem key={item.key}>
                <SidebarMenuButton
                  tooltip={item.title}
                  onClick={() => handleSidebarMenuClick(item)}
                  className={cn(
                    'transition-all'
                    // activeKey === item.key ? 'bg-primary! text-primary-foreground!' : 'text-foreground bg-transparent'
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
    </>
  )
}
