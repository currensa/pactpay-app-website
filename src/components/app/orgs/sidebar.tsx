import AppSidebar from '@/components/app/base/app-sidebar'
import { getOrgNavItems } from '@/router'
import { useHasPermission, Permission } from '@/utils/permissions'

interface OrgSidebarProps {
  mobileOpen?: boolean
  onMobileOpenChange?: (open: boolean) => void
}

export default function OrgSidebar({ mobileOpen, onMobileOpenChange }: OrgSidebarProps) {
  const hasPermission = useHasPermission()
  const canViewSettings = hasPermission(Permission.MODIFY_ORG_NETWORK)
  const navItems = getOrgNavItems().filter(item => item.key !== 'settings' || canViewSettings)
  return <AppSidebar navItems={navItems} mobileOpen={mobileOpen} onMobileOpenChange={onMobileOpenChange} />
}
