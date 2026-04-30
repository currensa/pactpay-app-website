import AppSidebar from '@/components/app/base/app-sidebar'
import type { OrgNavItem } from '@/router'
import useOrganizationStore from '@/stores/organization'
import { IconBuilding, IconLayoutDashboard, IconSettings } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const TOP_ITEMS: OrgNavItem[] = [
  { title: 'Dashboard', key: 'dashboard', url: '/member/dashboard', icon: IconLayoutDashboard },
]

const BOTTOM_ITEMS: OrgNavItem[] = [
  { title: 'Settings', key: 'settings', url: '/member/settings', icon: IconSettings },
]

export default function MemberSidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [navItems, setNavItems] = useState<OrgNavItem[]>([...TOP_ITEMS, ...BOTTOM_ITEMS])

  const { organizations, getOrganizations } = useOrganizationStore()

  if (organizations.length === 0) getOrganizations()

  useEffect(() => {
    const data = organizations
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
      isActive: (_pathname: string, state: unknown) => {
        if ((state as { orgId?: string })?.orgId === organization.orgId) return true
        const params = new URLSearchParams(window.location.search)
        return params.get('orgId') === organization.orgId
      }
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
  }, [location.key, navigate, organizations])

  return <AppSidebar navItems={navItems} hideSwitchButton />
}
