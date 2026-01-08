import api from '@/apis'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem
} from '@/components/ui/sidebar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  IconApps,
  IconAtom,
  IconBook,
  IconBriefcase,
  IconBuilding,
  IconBuildingArch,
  IconBuildingBank,
  IconBuildingCastle,
  IconBuildingFactory,
  IconBuildingSkyscraper,
  IconChevronDown,
  IconChevronRight,
  IconDiamond,
  IconGlobe,
  IconHelpCircle,
  IconLayoutDashboard,
  IconPlus,
  IconRocket,
  IconSettings
} from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

interface OrgItem {
  id: string
  name: string
  icon: typeof IconBuilding
  url: string
}

interface MenuItem {
  title: string
  key: string
  url: string
  icon: React.ForwardRefExoticComponent<React.SVGProps<SVGSVGElement> & React.RefAttributes<SVGSVGElement>>
  type?: 'item' | 'collapsible'
}

// 预定义9个不同的图标用于循环展示
const ORG_ICONS = [
  IconBuildingSkyscraper,
  IconBuildingFactory,
  IconBuildingCastle,
  IconBuildingBank,
  IconBuildingArch,
  IconBriefcase,
  IconGlobe,
  IconRocket,
  IconAtom,
  IconDiamond,
  IconApps
]

const NavMainItems: MenuItem[] = [
  {
    title: 'Overview',
    key: 'overview',
    url: '/member/overview',
    icon: IconLayoutDashboard,
    type: 'item'
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
  },
  {
    title: 'Setting',
    key: 'settings',
    url: '/member/settings',
    icon: IconSettings
  }
]

export default function MemberNavMenus() {
  const [isOrgsListOpen, setIsOrgsListOpen] = useState(true)
  const [orgsList, setOrgsList] = useState<OrgItem[]>([])
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    loadOrganizations()
  }, [])

  const loadOrganizations = async () => {
    try {
      const data = await api.organization.getOrganizations()
      const formattedOrgs = data.map((item, index) => ({
        id: item.organization.orgId,
        name: item.organization.orgName,
        // 循环使用图标，使用取模运算确保不会越界
        icon: ORG_ICONS[index % ORG_ICONS.length],
        url: '/member/orgdetail'
      }))
      setOrgsList(formattedOrgs)
    } catch (error) {
      console.error('Failed to load organizations:', error)
    }
  }

  function handleOrgClick(org: OrgItem) {
    navigate(org.url, { state: { orgId: org.id, orgName: org.name } })
  }

  function handleJoinNewOrg() {
    // TODO: 实现加入新组织的逻辑
    console.log('Join New Org')
  }

  const isRouteActive = (url: string) => {
    if (url.startsWith('http')) return false
    return location.pathname === url
  }

  const getOrgActive = (orgId: string) => {
    return location.pathname === '/member/orgdetail' && location.state?.orgId === orgId
  }

  // 只要有任何一个组织被选中，Organizations 父级菜单就高亮
  const isAnyOrgActive = orgsList.some(org => getOrgActive(org.id))

  return (
    <>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {/* Main Items */}
            {NavMainItems.map(item => {
              const isActive = isRouteActive(item.url)
              return (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    isActive={isActive}
                    tooltip={item.title}
                    onClick={() => navigate(item.url)}
                    className={cn('transition-all', !isActive && 'text-muted-foreground/70')}
                  >
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}

            {/* Organizations - Collapsible Menu (Custom Logic) */}
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={isAnyOrgActive}
                onClick={() => setIsOrgsListOpen(!isOrgsListOpen)}
                className={cn('transition-all', !isAnyOrgActive && 'text-muted-foreground/70')}
              >
                <IconBuilding />
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
                  {orgsList.map(org => {
                    const isActive = getOrgActive(org.id)
                    return (
                      <SidebarMenuSubItem key={org.id}>
                        <SidebarMenuSubButton
                          isActive={isActive}
                          onClick={() => handleOrgClick(org)}
                          className={cn(!isActive && 'text-muted-foreground/70')}
                        >
                          <org.icon className="h-4 w-4" />
                          <span>{org.name}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    )
                  })}
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup className="mt-auto">
        <SidebarGroupContent>
          <SidebarMenu>
            {NavSecondaryItems.map(item => {
              const isActive = isRouteActive(item.url)
              return (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    isActive={isActive}
                    tooltip={item.title}
                    onClick={() => {
                      if (item.url.startsWith('http')) {
                        window.open(item.url, '_blank')
                      } else {
                        navigate(item.url)
                      }
                    }}
                    className={cn('transition-all', !isActive && 'text-muted-foreground/70')}
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
    </>
  )
}
