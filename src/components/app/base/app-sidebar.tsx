import pactpayFont from '@/assets/pactpayFont.svg'
import pactpayIcon from '@/assets/pactpayIcon.svg'
import { OrganizationSwitcher } from '@/components/app/base/switcher'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import type { OrgNavItem } from '@/router'
import { useTranslation } from '@/utils/i18n'
import {
  IconChevronDown,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand
} from '@tabler/icons-react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

interface AppSidebarProps {
  navItems: OrgNavItem[]
  hideSwitchButton?: boolean
  mobileOpen?: boolean
  onMobileOpenChange?: (open: boolean) => void
}

export default function AppSidebar({
  navItems,
  hideSwitchButton,
  mobileOpen = false,
  onMobileOpenChange
}: AppSidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const [collapsed, setCollapsed] = useState(false)
  const [openKeys, setOpenKeys] = useState<Record<string, boolean>>({})

  const defaultIsActive = (url: string) =>
    location.pathname === url || location.pathname.startsWith(url + '/')

  const resolveChildActive = (child: NonNullable<OrgNavItem['children']>[number]) =>
    child.isActive
      ? child.isActive(location.pathname, location.state)
      : defaultIsActive(child.url)

  const closeMobileSidebar = () => {
    if (isMobile) onMobileOpenChange?.(false)
  }

  const handleNavigate = (url: string) => {
    navigate(url)
    closeMobileSidebar()
  }

  const handleChildClick = (child: NonNullable<OrgNavItem['children']>[number]) => {
    if (child.onClick) {
      child.onClick()
    } else {
      navigate(child.url)
    }
    closeMobileSidebar()
  }

  const toggleOpen = (key: string) =>
    setOpenKeys(prev => ({ ...prev, [key]: !prev[key] }))

  const sidebarContent = (
    <div
      className={cn(
        'flex h-full shrink-0 flex-col justify-between overflow-hidden bg-white transition-all duration-300',
        isMobile
          ? 'w-full rounded-none p-[20px]'
          : collapsed
            ? 'w-[80px] rounded-[32px] p-[24px]'
            : 'w-[240px] rounded-[32px] p-[24px]'
      )}
    >
      <div className="flex flex-col gap-[48px]">
        <div className={cn('flex items-center', collapsed && !isMobile ? 'justify-center' : 'justify-between')}>
          <div className="flex items-center gap-[8px]">
            <img src={pactpayIcon} alt="PactPay" className="h-[30px] w-[30px] shrink-0" />
            {(!collapsed || isMobile) && (
              <span className="whitespace-nowrap font-['Poppins',sans-serif] text-[18px] font-semibold text-[#1c1c26]">
                <img src={pactpayFont} alt="PactPay" className="w-[90px]" />
              </span>
            )}
          </div>
          {(!collapsed || isMobile) && !hideSwitchButton && <OrganizationSwitcher />}
        </div>

        <div className="flex flex-col gap-[4px]">
          {navItems.map(item => {
            const active = defaultIsActive(item.url)
            const hasChildren = !!item.children?.length
            const isOpen = openKeys[item.key]
            const itemTitle = item.titleKey ? t(item.titleKey) : item.title

            if (collapsed && !isMobile) {
              if (!hasChildren) {
                return (
                  <button
                    key={item.key}
                    onClick={() => handleNavigate(item.url)}
                    title={itemTitle}
                    className={cn(
                      'flex w-full items-center justify-center rounded-[16px] p-[16px] transition-colors',
                      active ? 'bg-[#5e85ee] text-white' : 'text-[#8d8d93] hover:bg-[#f5f5f5] hover:text-[#1c1c26]'
                    )}
                  >
                    <item.icon className="h-[22px] w-[22px] shrink-0" />
                  </button>
                )
              }

              return (
                <Popover key={item.key}>
                  <PopoverTrigger asChild>
                    <button
                      title={itemTitle}
                      className={cn(
                        'flex w-full items-center justify-center rounded-[16px] p-[16px] transition-colors',
                        active ? 'bg-[#5e85ee] text-white' : 'text-[#8d8d93] hover:bg-[#f5f5f5] hover:text-[#1c1c26]'
                      )}
                    >
                      <item.icon className="h-[22px] w-[22px] shrink-0" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side="right" align="start" sideOffset={8} className="w-[180px] rounded-[16px] p-[8px]">
                    <p className="mb-[4px] px-[12px] py-[6px] font-['Poppins',sans-serif] text-[13px] font-semibold text-[#8d8d93]">
                      {itemTitle}
                    </p>
                    {item.children!.map(child => (
                      <button
                        key={child.url}
                        onClick={() => handleChildClick(child)}
                        className={cn(
                          "flex w-full items-center gap-[8px] rounded-[12px] px-[12px] py-[8px] text-left font-['Poppins',sans-serif] text-[15px] font-medium transition-colors",
                          resolveChildActive(child)
                            ? 'bg-[rgba(94,133,238,0.1)] text-[#5e85ee]'
                            : 'text-[#606067] hover:bg-[#f5f5f5] hover:text-[#1c1c26]'
                        )}
                      >
                        {child.logoUrl
                          ? <img src={child.logoUrl} alt="" className="h-[20px] w-[20px] shrink-0 rounded-full object-cover" />
                          : <span className="h-[20px] w-[20px] shrink-0 rounded-full bg-[#f5f5f5]" />
                        }
                        <span className="truncate">{child.titleKey ? t(child.titleKey) : child.title}</span>
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
              )
            }

            return (
              <div key={item.key}>
                <button
                  onClick={() => {
                    if (hasChildren) {
                      toggleOpen(item.key)
                      return
                    }
                    handleNavigate(item.url)
                  }}
                  className={cn(
                    'flex w-full items-center gap-[12px] rounded-[16px] px-[20px] py-[14px] transition-colors',
                    active
                      ? 'bg-[#5e85ee] text-white'
                      : 'text-[#8d8d93] hover:bg-[#f5f5f5] hover:text-[#1c1c26]'
                  )}
                >
                  <item.icon className="h-[22px] w-[22px] shrink-0" />
                  <span className="whitespace-nowrap font-['Poppins',sans-serif] text-[15px] font-medium leading-[24px]">
                    {itemTitle}
                  </span>
                  {hasChildren && (
                    <IconChevronDown
                      className={cn('ml-auto h-[16px] w-[16px] shrink-0 transition-transform duration-200', isOpen && 'rotate-180')}
                    />
                  )}
                </button>

                {hasChildren && isOpen && (
                  <div className="mt-[4px] flex flex-col gap-[2px] pl-[16px]">
                    {item.children!.map(child => (
                      <button
                        key={child.url}
                        onClick={() => handleChildClick(child)}
                        className={cn(
                          "flex w-full items-center gap-[8px] rounded-[12px] px-[16px] py-[8px] text-left font-['Poppins',sans-serif] text-[15px] font-medium transition-colors",
                          resolveChildActive(child)
                            ? 'bg-[rgba(94,133,238,0.1)] text-[#5e85ee]'
                            : 'text-[#606067] hover:bg-[#f5f5f5] hover:text-[#1c1c26]'
                        )}
                      >
                        {child.logoUrl
                          ? <img src={child.logoUrl} alt="" className="h-[20px] w-[20px] shrink-0 rounded-full object-cover" />
                          : <span className="h-[20px] w-[20px] shrink-0 rounded-full bg-[#f5f5f5]" />
                        }
                        <span className="truncate">{child.titleKey ? t(child.titleKey) : child.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {!isMobile && (
        <button
          onClick={() => setCollapsed(prev => !prev)}
          className={cn(
            'flex h-[56px] w-[56px] items-center justify-center rounded-[16px] text-[#8d8d93] transition-colors hover:bg-[#f5f5f5] hover:text-[#1c1c26]',
            collapsed && 'self-center'
          )}
          title={collapsed ? t('common.expand') : t('common.collapse')}
        >
          {collapsed
            ? <IconLayoutSidebarLeftExpand className="h-[22px] w-[22px]" />
            : <IconLayoutSidebarLeftCollapse className="h-[22px] w-[22px]" />
          }
        </button>
      )}
    </div>
  )

  if (isMobile) {
    return (
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="w-[min(22rem,100vw)] border-r-0 p-0 sm:max-w-none [&>button]:hidden">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Primary application navigation.</SheetDescription>
          {sidebarContent}
        </SheetContent>
      </Sheet>
    )
  }

  return sidebarContent
}
