import pactpayFont from '@/assets/pactpayFont.svg'
import pactpayIcon from '@/assets/pactpayIcon.svg'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { OrgNavItem } from '@/router'
import {
  IconArrowsLeftRight,
  IconChevronDown,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand
} from '@tabler/icons-react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

interface AppSidebarProps {
  navItems: OrgNavItem[]
  /** 左上角切换按钮点击回调，默认跳转 selectOrg 步骤 */
  onSwitchClick?: () => void
  /** 隐藏左上角切换组织按钮 */
  hideSwitchButton?: boolean
}

export default function AppSidebar({ navItems, onSwitchClick, hideSwitchButton }: AppSidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [openKeys, setOpenKeys] = useState<Record<string, boolean>>({})

  const defaultIsActive = (url: string) =>
    location.pathname === url || location.pathname.startsWith(url + '/')

  const resolveChildActive = (child: OrgNavItem['children'][number]) =>
    child.isActive
      ? child.isActive(location.pathname, location.state)
      : defaultIsActive(child.url)

  const handleChildClick = (child: OrgNavItem['children'][number]) => {
    if (child.onClick) {
      child.onClick()
    } else {
      navigate(child.url)
    }
  }

  const toggleOpen = (key: string) =>
    setOpenKeys(prev => ({ ...prev, [key]: !prev[key] }))

  return (
    <div
      className={cn(
        'flex h-full shrink-0 flex-col justify-between overflow-hidden rounded-[32px] bg-white p-[24px] transition-all duration-300',
        collapsed ? 'w-[80px]' : 'w-[240px]'
      )}
    >
      {/* Top */}
      <div className="flex flex-col gap-[48px]">
        {/* Logo row */}
        <div className={cn('flex items-center', collapsed ? 'justify-center' : 'justify-between')}>
          <div className="flex items-center gap-[8px]">
            <img src={pactpayIcon} alt="PactPay" className="h-[30px] w-[30px] shrink-0" />
            {!collapsed && (
              <span className="whitespace-nowrap font-['Poppins',sans-serif] text-[18px] font-semibold text-[#1c1c26]">
                <img src={pactpayFont} alt="PactPay" className='w-[90px]' />
              </span>
            )}
          </div>
          {!collapsed && !hideSwitchButton && (
            <button
              onClick={onSwitchClick ?? (() => navigate('/account/login', { state: { step: 'selectOrg' } }))}
              className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white transition-colors hover:bg-[#f5f5f5]"
              title="Switch Organization"
            >
              <IconArrowsLeftRight className="h-[20px] w-[20px] text-[#1c1c26]" />
            </button>
          )}
        </div>

        {/* Nav items */}
        <div className="flex flex-col gap-[4px]">
          {navItems.map(item => {
            const active = defaultIsActive(item.url)
            const hasChildren = !!item.children?.length
            const isOpen = openKeys[item.key]

            /* ── Collapsed: icon only, children via Popover ── */
            if (collapsed) {
              if (!hasChildren) {
                return (
                  <button
                    key={item.key}
                    onClick={() => navigate(item.url)}
                    title={item.title}
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
                      title={item.title}
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
                      {item.title}
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
                        <span className="truncate">{child.title}</span>
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
              )
            }

            /* ── Expanded ── */
            return (
              <div key={item.key}>
                <button
                  onClick={() => hasChildren ? toggleOpen(item.key) : navigate(item.url)}
                  className={cn(
                    'flex w-full items-center gap-[12px] rounded-[16px] px-[20px] py-[14px] transition-colors',
                    active
                      ? 'bg-[#5e85ee] text-white'
                      : 'text-[#8d8d93] hover:bg-[#f5f5f5] hover:text-[#1c1c26]'
                  )}
                >
                  <item.icon className="h-[22px] w-[22px] shrink-0" />
                  <span className="whitespace-nowrap font-['Poppins',sans-serif] text-[15px] font-medium leading-[24px]">
                    {item.title}
                  </span>
                  {hasChildren && (
                    <IconChevronDown
                      className={cn('h-[16px] w-[16px] shrink-0 transition-transform duration-200', isOpen && 'rotate-180')}
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
                        <span className="truncate">{child.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Bottom: collapse / expand toggle */}
      <button
        onClick={() => setCollapsed(prev => !prev)}
        className={cn(
          'flex h-[56px] w-[56px] items-center justify-center rounded-[16px] text-[#8d8d93] transition-colors hover:bg-[#f5f5f5] hover:text-[#1c1c26]',
          collapsed && 'self-center'
        )}
        title={collapsed ? 'Expand' : 'Collapse'}
      >
        {collapsed
          ? <IconLayoutSidebarLeftExpand className="h-[22px] w-[22px]" />
          : <IconLayoutSidebarLeftCollapse className="h-[22px] w-[22px]" />
        }
      </button>
    </div>
  )
}
