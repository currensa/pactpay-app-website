import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
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
import { useIsMobile } from '@/hooks/use-mobile'
import { LANGUAGE_OPTIONS } from '@/i18n/messages'
import { getRouteMeta } from '@/router'
import useHeaderStore from '@/stores/header'
import useNotificationStore from '@/stores/notification'
import useOrganizationStore from '@/stores/organization'
import usePreferenceStore from '@/stores/preference'
import { useTranslation } from '@/utils/i18n'
import { useDisconnect } from '@reown/appkit/react'
import { IconBell, IconBuildingPlus, IconLanguage, IconLogout, IconMenu2, IconSwitchHorizontal, IconUser, IconUserPlus } from '@tabler/icons-react'
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

interface AppHeaderProps {
  onMenuClick?: () => void
}

export default function AppHeader({ onMenuClick }: AppHeaderProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { disconnect } = useDisconnect()
  const { steps, breadcrumb, backUrl } = useHeaderStore()
  const { t } = useTranslation()
  const { organizations, getOrganizations, setCurrentOrg, currentMember, currentOrgId } = useOrganizationStore()
  const { unreadCount, fetchUnreadCount } = useNotificationStore()
  const language = usePreferenceStore(s => s.language)
  const updateLanguagePreference = usePreferenceStore(s => s.updateLanguage)
  const isMobile = useIsMobile()
  const [onboardingDismissed, setOnboardingDismissed] = useState(
    () => localStorage.getItem('pactpay_onboarding_dismissed') === '1'
  )
  const [languageUpdating, setLanguageUpdating] = useState(false)

  const isMember = location.pathname.startsWith('/member')
  const orgId = isMember ? undefined : (currentOrgId ?? undefined)

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
    getOrganizations()
  }, [getOrganizations])

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
    const translatedMeta = {
      ...routeMeta,
      title: routeMeta.titleKey ? t(routeMeta.titleKey) : routeMeta.title,
      subtitle: routeMeta.subtitleKey ? t(routeMeta.subtitleKey) : routeMeta.subtitle,
    }
    if (state?.orgName) {
      return { ...translatedMeta, title: state.orgName, subtitle: state.desc ?? translatedMeta.subtitle }
    }
    return translatedMeta
  }, [location.pathname, location.state, t])

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

  const handleLanguageChange = async (nextLanguage: (typeof LANGUAGE_OPTIONS)[number]['value']) => {
    if (languageUpdating || nextLanguage === language) return

    try {
      setLanguageUpdating(true)
      await updateLanguagePreference(nextLanguage)
    } catch {
      // The request interceptor handles visible API errors.
    } finally {
      setLanguageUpdating(false)
    }
  }

  return (
    <div className="flex min-h-[64px] shrink-0 flex-col items-stretch gap-[12px] md:flex-row md:items-center md:justify-between">
      {/* Page title + subtitle / steps */}
      <div className="flex min-w-0 flex-1 items-start gap-[8px] pr-0 md:pr-[16px]">
        {isMobile && (
          <button
            type="button"
            onClick={onMenuClick}
            className="mt-[2px] flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-[12px] bg-white transition-colors hover:bg-[#f5f5f5]"
            aria-label="Open navigation menu"
          >
            <IconMenu2 className="h-[20px] w-[20px] text-[#1c1c26]" />
          </button>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-w-0 items-center gap-[8px]">
          {backUrl && (
            <button
              onClick={handleBack}
              className="flex h-[34px] w-[34px] items-center justify-center rounded-[8px] border border-[rgba(0,0,0,0.12)] bg-white hover:bg-[#f5f5f5] transition-colors shrink-0"
            >
              <ChevronLeft size={16} className="text-[#1c1c26]" />
            </button>
          )}
          <p className="flex min-w-0 items-center overflow-hidden text-ellipsis font-['Poppins',sans-serif] text-[20px] leading-[28px] text-[#1c1c26] md:h-[42px] md:text-[28px] md:leading-normal">
            {meta.title}
          </p>
        </div>
        {steps ? (
          <div className="mt-[2px] flex flex-wrap items-center gap-[10px]">
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
          <div className="mt-[1px] flex flex-wrap items-center gap-[4px]">
            {breadcrumb.map((item, i) => (
              <div key={i} className="flex min-w-0 items-center gap-[4px]">
                {i > 0 && <span className="text-[13px] text-[rgba(0,0,0,0.2)]">/</span>}
                {item.href ? (
                  <button
                    onClick={() => navigate(item.href!)}
                    className="max-w-full truncate text-[13px] leading-[22px] text-[#a4a4a8] transition-colors hover:text-[#606067]"
                  >
                    {item.label}
                  </button>
                ) : (
                  <span className="max-w-full truncate text-[13px] leading-[22px] text-[#1c1c26]">{item.label}</span>
                )}
              </div>
            ))}
          </div>
        ) : meta.subtitle ? (
          <HeaderSubtitle text={meta.subtitle} />
        ) : null}
        </div>
      </div>

      {/* Right: bell + user avatar */}
      <div className="flex shrink-0 items-center gap-[8px] self-end md:self-auto">
        {location.pathname === '/orgs/dashboard' && onboardingDismissed && (
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('pactpay:show-onboarding'))}
            title={t('common.gettingStartedGuide')}
            className="relative flex h-[40px] w-[40px] items-center justify-center rounded-full bg-white transition-colors hover:bg-[#f5f5f5] md:h-[48px] md:w-[48px]"
          >
            <ListChecks className="h-[18px] w-[18px] text-[#1c1c26] md:h-[22px] md:w-[22px]" />
          </button>
        )}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={t('settings.language')}
                  className="relative flex h-[40px] w-[40px] items-center justify-center rounded-full bg-white transition-colors hover:bg-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-60 md:h-[48px] md:w-[48px]"
                  disabled={languageUpdating}
                >
                  <IconLanguage className="h-[18px] w-[18px] text-[#1c1c26] md:h-[22px] md:w-[22px]" />
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>
              {t('settings.language')}
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent className="min-w-[160px] rounded-[12px]" align="end" sideOffset={8}>
            <DropdownMenuLabel>{t('settings.preferredLanguage')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {LANGUAGE_OPTIONS.map(option => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={option.value === language}
                disabled={languageUpdating}
                onSelect={() => { void handleLanguageChange(option.value) }}
                className="cursor-pointer"
              >
                {t(option.labelKey)}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          onClick={() => navigate(isMember ? '/member/notifications' : '/orgs/notifications')}
          className="relative flex h-[40px] w-[40px] items-center justify-center rounded-full bg-white transition-colors hover:bg-[#f5f5f5] md:h-[48px] md:w-[48px]"
        >
          <IconBell className="h-[18px] w-[18px] text-[#1c1c26] md:h-[22px] md:w-[22px]" />
          {unreadCount > 0 && (
            <span className="absolute right-[10px] top-[10px] h-[8px] w-[8px] rounded-full bg-[#d92b2b]" />
          )}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {isMember ? (
              <button className="flex h-[40px] w-[40px] items-center justify-center rounded-full bg-white outline-none transition-colors hover:bg-[#f5f5f5] md:h-[48px] md:w-[48px]">
                <IconUser className="h-[18px] w-[18px] text-[#1c1c26] md:h-[22px] md:w-[22px]" />
              </button>
            ) : (
              <button className="rounded-full outline-none ring-2 ring-white">
                <Avatar className="h-[40px] w-[40px] cursor-pointer rounded-full md:h-[48px] md:w-[48px]">
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
                <span className="text-sm font-medium text-[#1c1c26]">{t('common.account')}</span>
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
                  {t('common.createOrganization')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate('/welcome/join-org')}
                  className="cursor-pointer"
                >
                  <IconUserPlus className="mr-2 h-4 w-4" />
                  {t('common.joinOrganization')}
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
                    {t('common.joinOrganization')}
                  </DropdownMenuItem>
                )}
                {!isMember && (
                  <DropdownMenuItem
                    onClick={() => navigate('/welcome/create-org')}
                    className="cursor-pointer"
                  >
                    <IconBuildingPlus className="mr-2 h-4 w-4" />
                    {t('common.createOrganization')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="cursor-pointer">
                    <IconSwitchHorizontal className="mr-2 h-4 w-4" />
                    {t('common.changeRole')}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="rounded-[12px] min-w-[160px]">
                    {(
                      <DropdownMenuItem onClick={handleSwitchToMember} className="cursor-pointer">
                        <span className="text-[13px] text-[#1c1c26]">{t('common.asMember')}</span>
                      </DropdownMenuItem>
                    )}
                    {hasManagerRole && (
                      <DropdownMenuItem onClick={handleSwitchToManager} className="cursor-pointer">
                        <span className="text-[13px] text-[#1c1c26]">{t('common.asManager')}</span>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuGroup>
            )}
            {(showCreateOrg || hasMemberRole || hasManagerRole) && <DropdownMenuSeparator />}
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-500 focus:text-red-500">
              <IconLogout className="mr-2 h-4 w-4" />
              {t('common.logOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
