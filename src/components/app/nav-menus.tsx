import { cn } from '@/lib/utils'
import {
  IconAnalyze,
  IconBook,
  IconBuilding,
  IconBuildingSkyscraper,
  IconCashMove,
  IconChevronDown,
  IconChevronRight,
  IconHelpCircle,
  IconLayoutDashboard,
  IconPlus,
  IconRocket,
  IconSettings
} from '@tabler/icons-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem
} from '../ui/sidebar'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'

interface MenuItem {
  title: string
  key: string
  url: string
  icon: React.ForwardRefExoticComponent<React.SVGProps<SVGSVGElement> & React.RefAttributes<SVGSVGElement>>
}

// TODO: 从接口获取公司列表
const orgsList = [
  {
    id: 'techcorp',
    name: 'TechCorp Inc.',
    icon: IconBuilding,
    url: '/member/orgdetail?org=techcorp'
  },
  {
    id: 'digital-ventures',
    name: 'Digital Ventures',
    icon: IconRocket,
    url: '/member/orgdetail?org=digital-ventures'
  },
  {
    id: 'crypto-solutions',
    name: 'Crypto Solutions Ltd',
    icon: IconBuildingSkyscraper,
    url: '/member/orgdetail?org=crypto-solutions'
  }
]

const NavMainItems: MenuItem[] = [
  {
    title: 'Overview',
    key: 'overview',
    url: '/member/overview',
    icon: IconLayoutDashboard
  },
  {
    title: 'Dashboard',
    key: 'dashboard',
    url: '/orgs/dashboard',
    icon: IconLayoutDashboard
  },
  {
    title: 'Organization',
    key: 'organization',
    url: '/orgs/organization',
    icon: IconBuildingSkyscraper
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

export default function NavMenus() {
  const [isOrgsListOpen, setIsOrgsListOpen] = useState(true)
  const navigate = useNavigate()

  function handleSidebarMenuClick(menu: MenuItem) {
    navigate(menu.url)
  }

  function handleOrgClick(url: string) {
    navigate(url)
  }

  function handleJoinNewOrg() {
    // TODO: 实现加入新组织的逻辑
    console.log('Join New Org')
  }

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel className="text-muted-foreground/60">Menu</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {/* Overview */}
            {NavMainItems.filter(item => item.key === 'overview').map(item => {
              const isNewItem = ['overview'].includes(item.key)
              return (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    tooltip={item.title}
                    onClick={() => handleSidebarMenuClick(item)}
                    className={cn('transition-all', isNewItem && 'text-muted-foreground/70')}
                  >
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}

            {/* Organizations - Collapsible Menu */}
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => setIsOrgsListOpen(!isOrgsListOpen)} className="transition-all">
                <IconBuildingSkyscraper />
                <span>Organizations</span>
                {isOrgsListOpen ? (
                  <IconChevronDown className="ml-auto h-4 w-4" />
                ) : (
                  <IconChevronRight className="ml-auto h-4 w-4" />
                )}
              </SidebarMenuButton>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarMenuAction
                    onClick={e => {
                      e.stopPropagation()
                      handleJoinNewOrg()
                    }}
                  >
                    <IconPlus className="h-4 w-4" />
                  </SidebarMenuAction>
                </TooltipTrigger>
                <TooltipContent side="right" align="center">
                  Join New Org
                </TooltipContent>
              </Tooltip>
              {isOrgsListOpen && (
                <SidebarMenuSub>
                  {orgsList.map(org => (
                    <SidebarMenuSubItem key={org.id}>
                      <SidebarMenuSubButton
                        onClick={() => handleOrgClick(org.url)}
                        className="text-muted-foreground/70"
                      >
                        <org.icon className="h-4 w-4" />
                        <span>{org.name}</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>

            {/* Settings */}
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Setting"
                onClick={() => navigate('/member/settings')}
                className="transition-all"
              >
                <IconSettings />
                <span>Setting</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Other Menu Items */}
            {NavMainItems.filter(item => item.key !== 'overview').map(item => {
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
