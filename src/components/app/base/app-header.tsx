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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { getRouteMeta } from '@/router'
import useHeaderStore from '@/stores/header'
import useNotificationStore from '@/stores/notification'
import useOrganizationStore from '@/stores/organization'
import { useDisconnect } from '@reown/appkit/react'
import { IconBell, IconBuildingPlus, IconLogout, IconSwitchHorizontal, IconUser, IconUserPlus } from '@tabler/icons-react'
import { ChevronLeft, ListChecks } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

function HeaderSubtitle({ text }: { text: string }) {
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const [isOverflowing, setIsOverflowing] = useState(false)

  useEffect(() => {
    const element = subtitleRef.current
    if (!element) return

    const checkOverflow = () => {
      setIsOverflowing(element.scrollHeight > element.clientHeight + 1)
    }

    checkOverflow()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', checkOverflow)
      return () => window.removeEventListener('resize', checkOverflow)
    }

    const observer = new ResizeObserver(checkOverflow)
    observer.observe(element)
    return () => observer.disconnect()
  }, [text])

  const subtitleNode = (
    <p
      ref={subtitleRef}
      className="max-w-[720px] overflow-hidden font-['Inter',sans-serif] text-[14px] leading-[18px] text-[#a4a4a8]"
      style={{
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
      }}
    >
      {text}
    </p>
  )

  if (!isOverflowing) return subtitleNode

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {subtitleNode}
      </TooltipTrigger>
      <TooltipContent side="bottom" align="start" sideOffset={6} className="max-w-[420px] whitespace-pre-wrap px-3 py-2 text-[12px] leading-[14px]">
        {text}
      </TooltipContent>
    </Tooltip>
  )
}

export default function AppHeader() {
  const location = useLocation()
  const navigate = useNavigate()
  const { disconnect } = useDisconnect()
  const { steps, breadcrumb, backUrl } = useHeaderStore()
  const { organizations, getOrganizations, setCurrentOrg, currentMember, currentOrgId } = useOrganizationStore()
  const { unreadCount, fetchUnreadCount } = useNotificationStore()
  const [onboardingDismissed, setOnboardingDismissed] = useState(
    () => localStorage.getItem('pactpay_onboarding_dismissed') === '1'
  )

  const [orgId, setOrgId] = useState<string | undefined>(undefined);
  const [isMember, setIsMember] = useState(false)

  const hasMemberRole = useMemo(() => {
    return organizations.some(o =>
      o.member.roles.some(r => r.role === 'Member')
    )
  }, [organizations])

  const hasManagerRole = useMemo(() => {
    return organizations.some(o =>
      o.member.roles.some(r => ['Owner', 'Admin', 'Operator'].includes(r.role))
    )
  }, [organizations])

  useEffect(() => {

    setIsMember(location.pathname.startsWith('/member'))
    setOrgId(isMember ? undefined : (currentOrgId ?? undefined))

  }, [location])

  useEffect(() => {
    getOrganizations()
  }, [setIsMember])

  useEffect(() => {
    const onDismissed = () => setOnboardingDismissed(true)
    const onShown = () => setOnboardingDismissed(false)
    window.addEventListener('pactpay:onboarding-dismissed', onDismissed)
    window.addEventListener('pactpay:show-onboarding', onShown)
    return () => {
      window.removeEventListener('pactpay:onboarding-dismissed', onDismissed)
      window.removeEventListener('pactpay:show-onboarding', onShown)
    }
  }, [])

  // Poll unread count every 30s
  useEffect(() => {
    fetchUnreadCount(orgId)
    const timer = setInterval(() => fetchUnreadCount(orgId), 30_000)
    return () => clearInterval(timer)
  }, [orgId])

  // On /member pages: if only one role option exists, show "Create organization" instead of "Change Role"
  const changeRoleCount = (hasMemberRole ? 1 : 0) + (hasManagerRole ? 1 : 0)
  const showCreateOrg = isMember && changeRoleCount <= 1

  function handleSwitchToMember() {
    if (organizations.length === 0) return
    setCurrentOrg(organizations[0].organization.orgId, organizations[0].member)
    navigate('/member/dashboard')
  }

  function handleSwitchToManager() {
    const item = organizations.find(o =>
      o.member.roles.some(r => ['Owner', 'Admin', 'Operator'].includes(r.role))
    )
    if (!item) return
    setCurrentOrg(item.organization.orgId, item.member)
    navigate('/orgs/dashboard')
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
    localStorage.removeItem('userId')
    localStorage.removeItem('authType')
    localStorage.removeItem('authAddress')
    localStorage.removeItem('authEmail')
    localStorage.removeItem('organizationId')
    localStorage.removeItem('currentMember')
    localStorage.removeItem('pactpay_onboarding_dismissed')
    navigate('/welcome')
    window.location.reload()
  }

  const handleBack = () => {
    const historyIndex = typeof window !== 'undefined' ? window.history.state?.idx : undefined
    if (typeof historyIndex === 'number' && historyIndex > 0) {
      navigate(-1)
      return
    }
    if (backUrl) navigate(backUrl)
  }

  return (
    <div className="flex h-[64px] shrink-0 items-center justify-between">
      {/* Page title + subtitle / steps */}
      <div className="flex min-w-0 flex-col pr-[16px]">
        <div className="flex items-center gap-[8px]">
          {backUrl && (
            <button
              onClick={handleBack}
              className="flex h-[34px] w-[34px] items-center justify-center rounded-[8px] border border-[rgba(0,0,0,0.12)] bg-white hover:bg-[#f5f5f5] transition-colors shrink-0"
            >
              <ChevronLeft size={16} className="text-[#1c1c26]" />
            </button>
          )}
          <p className="flex h-[42px] items-center overflow-visible font-['Poppins',sans-serif] text-[28px] leading-normal text-[#1c1c26]">
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
          <HeaderSubtitle text={meta.subtitle} />
        ) : null}
      </div>

      {/* Right: bell + user avatar */}
      <div className="flex items-center gap-[8px]">
        {location.pathname === '/orgs/dashboard' && onboardingDismissed && (
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('pactpay:show-onboarding'))}
            title="Getting started guide"
            className="relative flex h-[48px] w-[48px] items-center justify-center rounded-full bg-white transition-colors hover:bg-[#f5f5f5]"
          >
            <ListChecks className="h-[22px] w-[22px] text-[#1c1c26]" />
          </button>
        )}
        <button
          onClick={() => navigate(isMember ? '/member/notifications' : '/orgs/notifications')}
          className="relative flex h-[48px] w-[48px] items-center justify-center rounded-full bg-white transition-colors hover:bg-[#f5f5f5]"
        >
          <IconBell className="h-[22px] w-[22px] text-[#1c1c26]" />
          {unreadCount > 0 && (
            <span className="absolute right-[10px] top-[10px] h-[8px] w-[8px] rounded-full bg-[#d92b2b]" />
          )}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {isMember ? (
              <button className="flex h-[48px] w-[48px] items-center justify-center rounded-full bg-white outline-none hover:bg-[#f5f5f5] transition-colors">
                <IconUser className="h-[22px] w-[22px] text-[#1c1c26]" />
              </button>
            ) : (
              <button className="rounded-full outline-none ring-2 ring-white">
                <Avatar className="h-[48px] w-[48px] cursor-pointer rounded-full">
                  <AvatarImage src={currentMember?.avatarUrl ?? ''} alt="Member" />
                  <AvatarFallback className="rounded-full bg-[#5e85ee] text-white">
                    {currentMember?.showName?.[0]?.toUpperCase() ?? 'U'}
                  </AvatarFallback>
                </Avatar>
              </button>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-48 rounded-[16px]" align="end" sideOffset={8}>
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-3 py-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f5f5f5] shrink-0">
                  <IconUser className="h-4 w-4 text-[#606067]" />
                </div>
                <span className="text-sm font-medium text-[#1c1c26]">Account</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {showCreateOrg ? (
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => navigate('/welcome/create-org')}
                  className="cursor-pointer"
                >
                  <IconBuildingPlus className="mr-2 h-4 w-4" />
                  Create organization
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate('/welcome/join-org')}
                  className="cursor-pointer"
                >
                  <IconUserPlus className="mr-2 h-4 w-4" />
                  Join a new organization
                </DropdownMenuItem>
              </DropdownMenuGroup>
            ) : (hasMemberRole || hasManagerRole) && (
              <DropdownMenuGroup>
                {isMember && (
                  <DropdownMenuItem
                    onClick={() => navigate('/welcome/join-org')}
                    className="cursor-pointer"
                  >
                    <IconUserPlus className="mr-2 h-4 w-4" />
                    Join a new organization
                  </DropdownMenuItem>
                )}
                {!isMember && (
                  <DropdownMenuItem
                    onClick={() => navigate('/welcome/create-org')}
                    className="cursor-pointer"
                  >
                    <IconBuildingPlus className="mr-2 h-4 w-4" />
                    Create organization
                  </DropdownMenuItem>
                )}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="cursor-pointer">
                    <IconSwitchHorizontal className="mr-2 h-4 w-4" />
                    Change Role
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="rounded-[12px] min-w-[160px]">
                    {(
                      <DropdownMenuItem onClick={handleSwitchToMember} className="cursor-pointer">
                        <span className="text-[13px] text-[#1c1c26]">As Member</span>
                      </DropdownMenuItem>
                    )}
                    {hasManagerRole && (
                      <DropdownMenuItem onClick={handleSwitchToManager} className="cursor-pointer">
                        <span className="text-[13px] text-[#1c1c26]">As Manager</span>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuGroup>
            )}
            {(showCreateOrg || hasMemberRole || hasManagerRole) && <DropdownMenuSeparator />}
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
