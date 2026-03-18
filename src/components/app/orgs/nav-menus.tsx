import { getOrgNavItems } from '@/router'
import { cn } from '@/lib/utils'
import { useLocation, useNavigate } from 'react-router-dom'

export default function OrgNavMenus() {
  const navigate = useNavigate()
  const location = useLocation()
  const navItems = getOrgNavItems()

  const isRouteActive = (url: string) =>
    location.pathname === url || location.pathname.startsWith(url + '/')

  return (
    <div className="flex flex-col gap-[4px]">
      {navItems.map(item => {
        const isActive = isRouteActive(item.url)
        return (
          <button
            key={item.key}
            onClick={() => navigate(item.url)}
            className={cn(
              'flex w-full items-center gap-[12px] rounded-[16px] px-[20px] py-[14px] transition-colors',
              isActive
                ? 'bg-[#5e85ee] text-white'
                : 'text-[#8d8d93] hover:bg-[#f5f5f5] hover:text-[#1c1c26]'
            )}
          >
            <item.icon className="h-[22px] w-[22px] shrink-0" />
            <span className="font-['Poppins',sans-serif] text-[15px] font-medium leading-[24px] whitespace-nowrap">
              {item.title}
            </span>
          </button>
        )
      })}
    </div>
  )
}
