import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import type { I18nKey } from '@/i18n/messages'
import { useTranslation } from '@/utils/i18n'
import { IconShield } from '@tabler/icons-react'
import { useLocation, useNavigate } from 'react-router-dom'

const AccountSettingItems = [
  {
    title: 'Account & Security',
    titleKey: 'nav.accountSecurity' as I18nKey,
    key: 'account',
    url: '/account/settings/account',
    icon: IconShield
  },
  // {
  //   title: 'General Preferences',
  //   key: 'preferences',
  //   url: '/account/settings/preferences',
  //   icon: IconGlobe
  // },
  // {
  //   title: 'Privacy & Data',
  //   key: 'privacy',
  //   url: '/account/settings/privacy',
  //   icon: IconLock,
  //   badge: 'Soon'
  // }
]

export default function AccountNavMenus() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()

  const isRouteActive = (url: string) => {
    return location.pathname === url
  }

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {AccountSettingItems.map(item => {
            const isActive = isRouteActive(item.url)
            const title = item.titleKey ? t(item.titleKey) : item.title
            return (
              <SidebarMenuItem key={item.key}>
                <SidebarMenuButton
                  isActive={isActive}
                  tooltip={title}
                  onClick={() => !isActive && navigate(item.url, { state: location.state })}
                  className={cn('transition-all', !isActive && 'text-muted-foreground/70')}
                >
                  <item.icon />
                  <span>{title}</span>
                  {/* {item.badge && (
                    <Badge variant="secondary" className="ml-auto text-[10px] h-5 px-1.5 min-w-0">
                      {item.badge}
                    </Badge>
                  )} */}
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

