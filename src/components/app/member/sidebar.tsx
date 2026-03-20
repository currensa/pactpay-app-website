import api from '@/apis'
import AppSidebar from '@/components/app/base/app-sidebar'
import type { OrgNavItem } from '@/router'
import { IconBuilding, IconLayoutDashboard, IconSettings } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const TOP_ITEMS: OrgNavItem[] = [
  { title: 'Dashboard', key: 'dashboard', url: '/member/dashboard', icon: IconLayoutDashboard },
]

const BOTTOM_ITEMS: OrgNavItem[] = [
  { title: 'Settings', key: 'settings', url: '/member/settings', icon: IconSettings },
]

export default function MemberSidebar() {
  const navigate = useNavigate()
  const [navItems, setNavItems] = useState<OrgNavItem[]>([...TOP_ITEMS, ...BOTTOM_ITEMS])

  useEffect(() => {
    api.organization.getOrganizations().then(data => {
      if (!data.length) {
        setNavItems([...TOP_ITEMS, ...BOTTOM_ITEMS])
        return
      }

      const orgChildren = data.map(({ organization, member }) => ({
        title: organization.orgName,
        url: '/member/orgdetail',
        logoUrl: organization.logoUrl,
        onClick: () =>
          navigate('/member/orgdetail', {
            state: {
              orgId: organization.orgId,
              orgName: organization.orgName,
              desc: organization.desc,
              memberId: member.memberId
            }
          }),
        isActive: (_pathname: string, state: unknown) =>
          (state as { orgId?: string })?.orgId === organization.orgId
      }))

      setNavItems([
        ...TOP_ITEMS,
        {
          title: 'Organizations',
          key: 'organizations',
          url: '/member/orgdetail',
          icon: IconBuilding,
          children: orgChildren
        },
        ...BOTTOM_ITEMS,
      ])
    }).catch(console.error)
  }, [])

  return <AppSidebar navItems={navItems} hideSwitchButton />
}
