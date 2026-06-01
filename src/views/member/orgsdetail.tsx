import api from '@/apis'
import { ImageCropUpload } from '@/components/app/image-crop-upload'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import useOrganizationStore from '@/stores/organization'
import { useTranslation } from '@/utils/i18n'
import { getHighestRole } from '@/utils/permissions'
import { PayrollHistoryTable } from '@/views/member/components/payroll-history-table'
import { IconCheck, IconCircleX, IconLoader2, IconPencil, IconX } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

export default function MemberOrgsDetail() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { orgId: stateOrgId = '', memberId = '' } = location.state || {}
  const orgId = searchParams.get('orgId') || stateOrgId
  const { toast } = useToast()
  const { t } = useTranslation()

  const [showName, setShowName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarPreview, setAvatarPreview] = useState('')
  const [role, setRole] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [nameError, setNameError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false)
  const [leaving, setLeaving] = useState(false)

  const { getOrganizations } = useOrganizationStore()

  useEffect(() => {
    if (!orgId) return
    getOrganizations().then(list => {
      const found = list.find(item => item.organization.orgId === orgId)
      if (!found) return
      const { member } = found
      setShowName(member.showName || '')
      setAvatarUrl(member.avatarUrl || '')
      setAvatarPreview(member.avatarUrl || '')
      setRole(getHighestRole(member.roles))
    }).catch(console.error)
  }, [orgId])

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

  async function saveProfile(name: string, avatar: string) {
    if (!orgId || !memberId) return
    try {
      setSaving(true)
      await api.organization.updateMemberProfile(orgId, memberId, {
        showName: name || undefined,
        avatarUrl: avatar || undefined,
      })
      toast({ description: t('pages.memberOrgDetail.profileUpdated') })
    } catch {
      throw new Error('save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleNameSave() {
    if (!nameInput.trim()) {
      setNameError(t('pages.memberOrgDetail.nameRequired'))
      return
    }
    setNameError('')
    try {
      await saveProfile(nameInput, avatarUrl)
      setShowName(nameInput)
      setEditingName(false)
    } catch {
      // error already set in saveProfile
    }
  }

  function startEditName() {
    setNameInput(showName)
    setNameError('')
    setEditingName(true)
  }

  async function handleLeaveOrganization() {
    if (!orgId) return

    try {
      setLeaving(true)
      await api.organization.leaveOrganization(orgId)

      if (localStorage.getItem('organizationId') === orgId) {
        localStorage.removeItem('organizationId')
        localStorage.removeItem('currentMember')
      }

      toast({ description: t('pages.memberOrgDetail.leftOrganization') })
      setLeaveDialogOpen(false)
      navigate('/member/dashboard', { replace: true })
    } catch {
      // request interceptor handles API errors
    } finally {
      setLeaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-[12px]">
      <p className="font-['Poppins',sans-serif] text-[18px] leading-[28px] text-[#1c1c26]">
        {t('pages.memberOrgDetail.personalInformation')}
      </p>

      <div className="flex flex-col items-start gap-[20px] rounded-[24px] bg-white p-[16px] md:rounded-[32px] md:p-[24px] xl:flex-row xl:gap-[24px]">
        {/* Avatar column */}
        <div className="flex flex-col items-center gap-[12px] shrink-0">
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

        {/* Info column */}
        <div className="flex w-full min-w-0 flex-col gap-[16px]">
          <div className="flex flex-col gap-[16px] border-b border-[rgba(0,0,0,0.12)] pb-[20px] md:pb-[24px]">
            {/* Name */}
            <div className="flex w-full max-w-[240px] flex-col gap-[8px]">
              <p className="text-[14px] leading-[22px] text-[#8d8d93]">{t('pages.memberOrgDetail.name')}</p>
              <div className="flex flex-col gap-[2px]">
                <div className="h-[36px] flex items-center">
                  {editingName ? (
                    <div className="flex items-center gap-[8px] bg-[#f5f5f5] border border-[rgba(255,255,255,0.12)] rounded-[12px] px-[12px] py-[6px] w-full h-full">
                      <input
                        autoFocus
                        value={nameInput}
                        onChange={e => { setNameInput(e.target.value); if (nameError) setNameError('') }}
                        onKeyDown={e => { if (e.key === 'Enter') handleNameSave(); if (e.key === 'Escape') setEditingName(false) }}
                        className="flex-1 bg-transparent text-[16px] leading-[24px] text-[#1c1c26] outline-none min-w-0"
                      />
                      <div className="flex items-center gap-[4px] shrink-0">
                        <button
                          onClick={handleNameSave}
                          disabled={saving}
                          className="flex items-center justify-center h-[24px] w-[24px] rounded-[6px] bg-[#5e85ee] hover:opacity-90 transition-opacity"
                        >
                          <IconCheck className="h-[14px] w-[14px] text-white" />
                        </button>
                        <button
                          onClick={() => { setEditingName(false); setNameError('') }}
                          className="flex items-center justify-center h-[24px] w-[24px] rounded-[6px] bg-white border border-[rgba(0,0,0,0.12)] hover:bg-[#f5f5f5] transition-colors"
                        >
                          <IconX className="h-[14px] w-[14px] text-[#1c1c26]" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-[4px]">
                      <p className="text-[16px] leading-[24px] text-[#1c1c26]">{showName || '—'}</p>
                      <button
                        onClick={startEditName}
                        className="flex items-center text-[#8d8d93] hover:text-[#5e85ee] transition-colors"
                      >
                        <IconPencil className="h-[18px] w-[18px]" />
                      </button>
                    </div>
                  )}
                </div>
                {nameError && (
                  <div className="flex items-center gap-[2px]">
                    <IconCircleX className="h-[16px] w-[16px] text-[#d92b2b] shrink-0" />
                    <p className="text-[14px] leading-[22px] text-[#d92b2b]">{nameError}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Role */}
            <div className="flex w-full max-w-[240px] flex-col gap-[8px]">
              <p className="text-[14px] leading-[22px] text-[#8d8d93]">{t('pages.memberOrgDetail.roleInOrganization')}</p>
              <p className="text-[16px] leading-[24px] text-[#1c1c26]">{role || '—'}</p>
            </div>
          </div>

          {/* Leave */}
          <button
            onClick={() => setLeaveDialogOpen(true)}
            disabled={!orgId || leaving}
            className="text-[14px] leading-[22px] text-[#d92b2b] hover:opacity-80 transition-opacity text-left disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('pages.memberOrgDetail.leaveOrganization')}
          </button>
        </div>
      </div>

      {/* Data Summary */}
      <p className="font-['Poppins',sans-serif] text-[18px] leading-[28px] text-[#1c1c26]">{t('pages.memberDashboard.dataSummary')}</p>
      <div className="rounded-[24px] bg-white p-[16px] md:rounded-[32px]">
        <PayrollHistoryTable orgId={orgId} memberId={memberId} />
      </div>

      <Dialog open={leaveDialogOpen} onOpenChange={open => { if (!leaving) setLeaveDialogOpen(open) }}>
        <DialogContent className="max-w-[416px] gap-0 rounded-[24px] border-none bg-white p-[24px] shadow-[0px_298px_84px_0px_rgba(0,0,0,0),0px_191px_76px_0px_rgba(0,0,0,0.01),0px_107px_64px_0px_rgba(0,0,0,0.02),0px_48px_48px_0px_rgba(0,0,0,0.03),0px_12px_26px_0px_rgba(0,0,0,0.04)] sm:rounded-[24px] [&>button:last-child]:hidden">
          <DialogHeader className="flex-row items-center justify-between space-y-0 text-left">
            <DialogTitle className="font-['Inter',sans-serif] text-[18px] font-bold leading-[28px] text-[#1c1c26]">
              {t('pages.memberOrgDetail.leaveOrganization')}
            </DialogTitle>
            <DialogClose
              disabled={leaving}
              className="flex h-[24px] w-[24px] items-center justify-center rounded-[8px] text-[#1c1c26] transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <IconX className="h-[16px] w-[16px]" />
            </DialogClose>
          </DialogHeader>

          <DialogDescription className="mt-[24px] max-w-[368px] font-['Inter',sans-serif] text-[14px] leading-[22px] text-[#606067]">
            {t('pages.memberOrgDetail.leaveDescription')}
          </DialogDescription>

          <DialogFooter className="mt-[24px] flex-row justify-end gap-[12px] space-x-0">
            <button
              type="button"
              onClick={() => setLeaveDialogOpen(false)}
              disabled={leaving}
              className="rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white px-[16px] py-[10px] font-['Inter',sans-serif] text-[14px] leading-[22px] text-[#1c1c26] transition-colors hover:bg-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleLeaveOrganization}
              disabled={leaving}
              className="flex min-w-[72px] items-center justify-center gap-[6px] rounded-[12px] bg-[#d92b2b] px-[16px] py-[10px] font-['Inter',sans-serif] text-[14px] leading-[22px] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {leaving && <IconLoader2 className="h-[14px] w-[14px] animate-spin" />}
              {t('pages.memberOrgDetail.leave')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
