import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { getRouteMeta } from '@/router'
import useHeaderStore from '@/stores/header'
import useOrganizationStore from '@/stores/organization'
import { useDisconnect } from '@reown/appkit/react'
import { IconBell, IconLogout, IconSwitchHorizontal } from '@tabler/icons-react'
import { ChevronLeft } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

export default function AppHeader() {
  const location = useLocation()
  const navigate = useNavigate()
  const { disconnect } = useDisconnect()
  const { steps, breadcrumb, backUrl } = useHeaderStore()
  const { organizations, getOrganizations, setCurrentOrg } = useOrganizationStore()

  useEffect(() => {
    if (organizations.length === 0) getOrganizations().catch(() => { })
  }, [])

  function handleRoleSelect(orgId: string, role: string) {
    const item = organizations.find(o => o.organization.orgId === orgId)
    if (!item) return
    setCurrentOrg(orgId, item.member)
    const isAdmin = ['Owner', 'Admin', 'Operator'].includes(role)
    navigate(isAdmin ? '/orgs/dashboard' : '/employee/dashboard')
  }

  const meta = useMemo(() => {
    const routeMeta = getRouteMeta(location.pathname) ?? {}
    const state = location.state as { orgName?: string; desc?: string } | null
    if (state?.orgName) {
      return { ...routeMeta, title: state.orgName, subtitle: state.desc ?? routeMeta.subtitle }
    }
    return routeMeta
  }, [location.pathname, location.state])

  async function handleLogout() {
    await disconnect()
    localStorage.removeItem('token')
    navigate('/account/login')
    window.location.reload()
  }

  return (
    <div className="flex shrink-0 items-center justify-between">
      {/* Page title + subtitle / steps */}
      <div className="flex flex-col">
        <div className="flex items-center gap-[8px]">
          {backUrl && (
            <button
              onClick={() => navigate(backUrl)}
              className="flex h-[34px] w-[34px] items-center justify-center rounded-[8px] border border-[rgba(0,0,0,0.12)] bg-white hover:bg-[#f5f5f5] transition-colors shrink-0"
            >
              <ChevronLeft size={16} className="text-[#1c1c26]" />
            </button>
          )}
          <p className="font-['Poppins',sans-serif] text-[28px] leading-[40px] text-[#1c1c26]">
            {meta.title}
          </p>
        </div>
        {steps ? (
          <div className="flex items-center gap-[10px] mt-[2px]">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-[10px]">
                {i > 0 && <div className="w-[20px] h-px bg-[rgba(0,0,0,0.2)]" />}
                <span className={`text-[13px] leading-[22px] ${step.active ? 'text-[#5e85ee]' : 'text-[#1c1c26]'}`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        ) : breadcrumb ? (
          <div className="flex items-center gap-[4px] mt-[1px]">
            {breadcrumb.map((item, i) => (
              <div key={i} className="flex items-center gap-[4px]">
                {i > 0 && <span className="text-[13px] text-[rgba(0,0,0,0.2)]">/</span>}
                {item.href ? (
                  <button
                    onClick={() => navigate(item.href!)}
                    className="text-[13px] leading-[22px] text-[#a4a4a8] hover:text-[#606067] transition-colors"
                  >
                    {item.label}
                  </button>
                ) : (
                  <span className="text-[13px] leading-[22px] text-[#1c1c26]">{item.label}</span>
                )}
              </div>
            ))}
          </div>
        ) : meta.subtitle ? (
          <p className="font-['Inter',sans-serif] text-[14px] leading-[22px] text-[#a4a4a8]">
            {meta.subtitle}
          </p>
        ) : null}
      </div>

      {/* Right: bell + user avatar */}
      <div className="flex items-center gap-[8px]">
        <button className="flex h-[48px] w-[48px] items-center justify-center rounded-full bg-white transition-colors hover:bg-[#f5f5f5]">
          <IconBell className="h-[22px] w-[22px] text-[#1c1c26]" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-full outline-none ring-2 ring-white">
              <Avatar className="h-[48px] w-[48px] cursor-pointer rounded-full">
                <AvatarImage src="https://github.com/shadcn.png" alt="User" />
                <AvatarFallback className="rounded-full bg-[#5e85ee] text-white">U</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-48 rounded-[16px]" align="end" sideOffset={8}>
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-3 py-2">
                <Avatar className="h-8 w-8 rounded-full">
                  <AvatarImage src="https://github.com/shadcn.png" alt="User" />
                  <AvatarFallback className="rounded-full bg-[#5e85ee] text-white text-xs">U</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[#1c1c26]">Account</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="cursor-pointer">
                  <IconSwitchHorizontal className="mr-2 h-4 w-4" />
                  Change Role
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="rounded-[12px] min-w-[200px]">
                  {organizations.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-[#8d8d93]">No organizations</div>
                  ) : (
                    organizations.map(({ organization, member }) =>
                      member.roles.map(({ role }) => (
                        <DropdownMenuItem
                          key={`${organization.orgId}-${role}`}
                          onClick={() => handleRoleSelect(organization.orgId, role)}
                          className="cursor-pointer flex flex-col items-start gap-0"
                        >
                          <span className="text-[13px] font-medium text-[#1c1c26]">{organization.name}</span>
                          <span className="text-[12px] text-[#8d8d93]">{role}</span>
                        </DropdownMenuItem>
                      ))
                    )
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-500 focus:text-red-500">
              <IconLogout className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
