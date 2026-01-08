import { Badge } from '@/components/ui/badge'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import { IconGlobe, IconLock, IconShield } from '@tabler/icons-react'
import { useLocation, useNavigate } from 'react-router-dom'

const SettingItems = [
  {
    title: 'Account & Security',
    key: 'account',
    url: '/member/settings/account',
    icon: IconShield
  },
  {
    title: 'General Preferences',
    key: 'preferences',
    url: '/member/settings/preferences',
    icon: IconGlobe
  },
  {
    title: 'Privacy & Data',
    key: 'privacy',
    url: '/member/settings/privacy',
    icon: IconLock,
    badge: 'Soon'
  }
]

export default function SettingNavMenus() {
  const navigate = useNavigate()
  const location = useLocation()

  const isRouteActive = (url: string) => {
    return location.pathname === url
  }

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {SettingItems.map(item => {
            const isActive = isRouteActive(item.url)
            return (
              <SidebarMenuItem key={item.key}>
                <SidebarMenuButton
                  isActive={isActive}
                  tooltip={item.title}
                  onClick={() => navigate(item.url)}
                  className={cn('transition-all', !isActive && 'text-muted-foreground/70')}
                >
                  <item.icon />
                  <span>{item.title}</span>
                  {item.badge && (
                    <Badge variant="secondary" className="ml-auto text-[10px] h-5 px-1.5 min-w-0">
                      {item.badge}
                    </Badge>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

