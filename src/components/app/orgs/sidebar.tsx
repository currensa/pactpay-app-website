import AppSidebar from '@/components/app/base/app-sidebar'
import { getOrgNavItems } from '@/router'

export default function OrgSidebar() {
  return <AppSidebar navItems={getOrgNavItems()} />
}
