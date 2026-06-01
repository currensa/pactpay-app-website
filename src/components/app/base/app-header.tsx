import api from '@/apis'
import { ImageCropUpload } from '@/components/app/image-crop-upload'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
import { useToast } from '@/components/ui/use-toast'
import { useIsMobile } from '@/hooks/use-mobile'
import { LANGUAGE_OPTIONS } from '@/i18n/messages'
import { getRouteMeta } from '@/router'
import useHeaderStore from '@/stores/header'
import useNotificationStore from '@/stores/notification'
import useOrganizationStore from '@/stores/organization'
import usePreferenceStore from '@/stores/preference'
import { useTranslation } from '@/utils/i18n'
import { getHighestRole } from '@/utils/permissions'
import { useDisconnect } from '@reown/appkit/react'
import { IconBell, IconBuildingPlus, IconCheck, IconCircleX, IconLanguage, IconLogout, IconMenu2, IconPencil, IconSwitchHorizontal, IconUser, IconUserPlus, IconX } from '@tabler/icons-react'
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
  const { toast } = useToast()
  const { organizations, getOrganizations, setCurrentOrg, updateCurrentMember, currentMember, currentOrgId } = useOrganizationStore()
  const { unreadCount, fetchUnreadCount } = useNotificationStore()
  const language = usePreferenceStore(s => s.language)
  const updateLanguagePreference = usePreferenceStore(s => s.updateLanguage)
  const isMobile = useIsMobile()
  const [onboardingDismissed, setOnboardingDismissed] = useState(
    () => localStorage.getItem('pactpay_onboarding_dismissed') === '1'
  )
  const [languageUpdating, setLanguageUpdating] = useState(false)
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [showName, setShowName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarPreview, setAvatarPreview] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [nameError, setNameError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  const isMember = location.pathname.startsWith('/member')
  const orgId = isMember ? undefined : (currentOrgId ?? undefined)
  const currentRole = useMemo(() => (currentMember ? getHighestRole(currentMember.roles) : ''), [currentMember])

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

  useEffect(() => {
    if (!currentMember) return
    setShowName(currentMember.showName || '')
    setAvatarUrl(currentMember.avatarUrl || '')
    setAvatarPreview(currentMember.avatarUrl || '')
  }, [currentMember])

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

  async function saveProfile(name: string, avatar: string) {
    if (!currentMember?.memberId || !currentMember?.orgId) return

    try {
      setSaving(true)
      const updatedMember = await api.organization.updateMemberProfile(currentMember.orgId, currentMember.memberId, {
        showName: name || undefined,
        avatarUrl: avatar || undefined,
      })
      updateCurrentMember(updatedMember)
      setShowName(updatedMember.showName || '')
      setAvatarUrl(updatedMember.avatarUrl || '')
      setAvatarPreview(updatedMember.avatarUrl || '')
      toast({ description: t('pages.memberOrgDetail.profileUpdated') })
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatarCropped(file: File, previewUrl: string) {
    const previousPreview = avatarPreview

    try {
      setAvatarPreview(previewUrl)
      setUploading(true)
      const url = await api.storage.uploadFile(file)
      setAvatarUrl(url)
      await saveProfile(showName, url)
    } catch {
      toast({ description: t('pages.memberOrgDetail.uploadFailed'), variant: 'destructive' })
      setAvatarPreview(previousPreview)
    } finally {
      setUploading(false)
    }
  }

  async function handleNameSave() {
    if (!nameInput.trim()) {
      setNameError(t('pages.memberOrgDetail.nameRequired'))
      return
    }

    setNameError('')

    try {
      await saveProfile(nameInput.trim(), avatarUrl)
      setEditingName(false)
    } catch {
      // The request interceptor handles visible API errors.
    }
  }

  function startEditName() {
    setNameInput(showName)
    setNameError('')
    setEditingName(true)
  }

  return (
    <>
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
            {!isMember && (
              <>
                <DropdownMenuItem onClick={() => setProfileDialogOpen(true)} className="cursor-pointer px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8 rounded-full">
                      <AvatarImage src={currentMember?.avatarUrl ?? ''} alt={currentMember?.showName ?? 'Member'} />
                      <AvatarFallback className="rounded-full bg-[#5e85ee] text-white">
                        {currentMember?.showName?.[0]?.toUpperCase() ?? 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-col">
                      <span className="text-sm font-medium text-[#1c1c26]">{showName || t('common.account')}</span>
                      <span className="text-xs text-[#8d8d93]">{t('pages.memberOrgDetail.personalInformation')}</span>
                    </div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
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
    <Dialog
      open={profileDialogOpen}
      onOpenChange={open => {
        if (saving || uploading) return
        setProfileDialogOpen(open)
        if (!open) {
          setEditingName(false)
          setNameError('')
        }
      }}
    >
      <DialogContent className="max-w-[760px] rounded-[28px] border border-[rgba(0,0,0,0.06)] bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_100%)] p-[24px] md:p-[28px]">
        <DialogHeader className="border-b border-[rgba(0,0,0,0.08)] pb-[18px]">
          <DialogTitle>{t('pages.memberOrgDetail.personalInformation')}</DialogTitle>
          <DialogDescription>{t('pages.memberOrgDetail.profileDescription')}</DialogDescription>
        </DialogHeader>

        <div className="mt-[24px] rounded-[24px] border border-[rgba(0,0,0,0.08)] bg-white p-[20px] md:p-[24px]">
          <div className="flex flex-col gap-[20px] md:flex-row md:items-start md:gap-[24px]">
            <div className="flex shrink-0 flex-col items-center gap-[12px] md:w-[140px]">
              <ImageCropUpload
                imageUrl={avatarPreview}
                alt={showName}
                fallback={showName?.[0]?.toUpperCase() || '?'}
                variant="avatar"
                actionLabel={uploading ? t('pages.memberOrgDetail.uploading') : t('common.change')}
                uploading={uploading}
                acceptedMimeTypes={['image/png', 'image/jpeg']}
                previewWrapperClassName="h-[108px] w-[108px] border-none"
                onValidationError={kind => {
                  if (kind === 'size') {
                    toast({ description: t('pages.memberOrgDetail.imageUnder2Mb'), variant: 'destructive' })
                    return
                  }
                  toast({ description: t('pages.memberOrgDetail.uploadPngOrJpg'), variant: 'destructive' })
                }}
                onCropped={({ file, previewUrl }) => void handleAvatarCropped(file, previewUrl)}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-[16px]">
                <div className="flex flex-col gap-[8px]">
                  <div className="flex items-start justify-between gap-[12px]">
                    <div className="min-w-0">
                      <p className="text-[14px] leading-[22px] text-[#8d8d93]">{t('pages.memberOrgDetail.name')}</p>
                    </div>
                    {!editingName && (
                      <button
                        onClick={startEditName}
                        className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[10px] bg-[#f5f5f5] text-[#8d8d93] transition-colors hover:bg-[#eef2ff] hover:text-[#5e85ee]"
                      >
                        <IconPencil className="h-[16px] w-[16px]" />
                      </button>
                    )}
                  </div>

                  {editingName ? (
                    <div className="flex min-h-[44px] items-center gap-[8px] rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-[#f5f5f5] px-[12px] py-[6px]">
                      <input
                        autoFocus
                        value={nameInput}
                        onChange={e => {
                          setNameInput(e.target.value)
                          if (nameError) setNameError('')
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') void handleNameSave()
                          if (e.key === 'Escape') setEditingName(false)
                        }}
                        className="min-w-0 flex-1 bg-transparent text-[16px] leading-[24px] text-[#1c1c26] outline-none"
                      />
                      <div className="flex shrink-0 items-center gap-[4px]">
                        <button
                          onClick={() => void handleNameSave()}
                          disabled={saving}
                          className="flex h-[24px] w-[24px] items-center justify-center rounded-[6px] bg-[#5e85ee] transition-opacity hover:opacity-90 disabled:opacity-60"
                        >
                          <IconCheck className="h-[14px] w-[14px] text-white" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingName(false)
                            setNameError('')
                          }}
                          className="flex h-[24px] w-[24px] items-center justify-center rounded-[6px] border border-[rgba(0,0,0,0.12)] bg-white transition-colors hover:bg-[#f5f5f5]"
                        >
                          <IconX className="h-[14px] w-[14px] text-[#1c1c26]" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[20px] font-semibold leading-[28px] text-[#1c1c26]">{showName || '-'}</p>
                  )}

                  {nameError && (
                    <div className="flex items-center gap-[4px]">
                      <IconCircleX className="h-[16px] w-[16px] shrink-0 text-[#d92b2b]" />
                      <p className="text-[14px] leading-[22px] text-[#d92b2b]">{nameError}</p>
                    </div>
                  )}
                </div>

                <div className="border-t border-[rgba(0,0,0,0.08)] pt-[16px]">
                  <p className="text-[14px] leading-[22px] text-[#8d8d93]">{t('pages.memberOrgDetail.roleInOrganization')}</p>
                  <p className="mt-[4px] text-[16px] leading-[24px] text-[#1c1c26]">{currentRole || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}
