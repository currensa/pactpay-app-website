import { cn } from '@/lib/utils'
import { getMemberNavItems, type OrgNavItem } from '@/router'
import useOrganizationStore from '@/stores/organization'
import { IconBuilding } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

export default function MemberNavMenus() {
  const navigate = useNavigate()
  const location = useLocation()
  const staticItems = getMemberNavItems()
  const [orgChildren, setOrgChildren] = useState<OrgNavItem['children']>([])
  const { organizations } = useOrganizationStore()

  useEffect(() => {
    const data = organizations
    if (!data.length) return
    setOrgChildren(
      data.map(({ organization, member }) => ({
        title: organization.orgName,
        url: '/member/orgdetail',
        onClick: () =>
          navigate('/member/orgdetail', {
            state: {
              orgId: organization.orgId,
              orgName: organization.orgName,
              memberId: member.memberId
            }
          }),
        isActive: (_pathname: string, state: unknown) =>
          (state as { orgId?: string })?.orgId === organization.orgId
      }))
    )
  }, [])

  const isActive = (url: string) =>
    location.pathname === url || location.pathname.startsWith(url + '/')

  const isChildActive = (child: OrgNavItem['children'][number]) =>
    child.isActive
      ? child.isActive(location.pathname, location.state)
      : location.pathname === child.url

  // 分离 settings（末尾固定项）和其余静态项
  const topItems = staticItems.filter(i => i.key !== 'settings')
  const settingsItem = staticItems.find(i => i.key === 'settings')

  const renderItem = (item: OrgNavItem) => {
    const active = isActive(item.url)
    return (
      <button
        key={item.key}
        onClick={() => navigate(item.url)}
        className={cn(
          'flex w-full items-center gap-[12px] rounded-[16px] px-[20px] py-[14px] transition-colors',
          active ? 'bg-[#5e85ee] text-white' : 'text-[#8d8d93] hover:bg-[#f5f5f5] hover:text-[#1c1c26]'
        )}
      >
        <item.icon className="h-[22px] w-[22px] shrink-0" />
        <span className="font-['Poppins',sans-serif] text-[15px] font-medium leading-[24px] whitespace-nowrap">
          {item.title}
        </span>
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-[4px]">
      {topItems.map(renderItem)}

      {/* Dynamic org sub-menu */}
      {orgChildren && orgChildren.length > 0 && (
        <div>
          <div className={cn(
            'flex w-full items-center gap-[12px] rounded-[16px] px-[20px] py-[14px]',
            'text-[#8d8d93]'
          )}>
            <IconBuilding className="h-[22px] w-[22px] shrink-0" />
            <span className="font-['Poppins',sans-serif] text-[15px] font-medium leading-[24px] whitespace-nowrap">
              Organizations
            </span>
          </div>
          <div className="mt-[4px] flex flex-col gap-[2px] pl-[16px]">
            {orgChildren.map(child => (
              <button
                key={child.url + child.title}
                onClick={() => child.onClick ? child.onClick() : navigate(child.url)}
                className={cn(
                  "flex w-full items-center rounded-[12px] px-[16px] py-[8px] text-left font-['Inter',sans-serif] text-[14px] transition-colors",
                  isChildActive(child)
                    ? 'bg-[rgba(94,133,238,0.1)] font-medium text-[#5e85ee]'
                    : 'text-[#606067] hover:bg-[#f5f5f5] hover:text-[#1c1c26]'
                )}
              >
                {child.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {settingsItem && renderItem(settingsItem)}
    </div>
  )
}
