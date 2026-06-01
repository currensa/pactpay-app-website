import api from '@/apis'
import { ImageCropUpload } from '@/components/app/image-crop-upload'
import useAuthStore from '@/stores/auth'
import useOrganizationStore from '@/stores/organization'
import { usePublicCopy } from '@/views/public/copy'
import { IconArrowLeft } from '@tabler/icons-react'
import { FormEvent, useEffect, useState } from 'react'

interface CreateOrgStep1Props {
  onBack: () => void
  onNext: (orgName: string, options?: { redirectToBindWallet?: boolean }) => void
}

export default function CreateOrgStep1({ onBack, onNext }: CreateOrgStep1Props) {
  const { copy } = usePublicCopy()
  const [orgName, setOrgName] = useState('')
  const [showName, setShowName] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingMetaPub, setIsCheckingMetaPub] = useState(true)
  const [metaPubSubmitted, setMetaPubSubmittedState] = useState<boolean | null>(null)
  const [shouldReceivePayroll, setShouldReceivePayroll] = useState(false)
  const setCurrentOrg = useOrganizationStore(s => s.setCurrentOrg)
  const cachedMetaPubSubmitted = useAuthStore(s => s.metaPubSubmitted)
  const setMetaPubSubmitted = useAuthStore(s => s.setMetaPubSubmitted)
  const { getOrganizations } = useOrganizationStore()
  useEffect(() => {
    let active = true

    const loadMetaPubStatus = async () => {
      try {
        const { submitted } = await api.auth.getMetaPubStatus()
        if (!active) return
        setMetaPubSubmittedState(submitted)
        setMetaPubSubmitted(submitted)
      } catch (error) {
        if (!active) return
        setMetaPubSubmittedState(cachedMetaPubSubmitted)
        console.error('Failed to get metaPub status:', error)
      } finally {
        if (active) setIsCheckingMetaPub(false)
      }
    }

    loadMetaPubStatus()

    return () => {
      active = false
    }
  }, [cachedMetaPubSubmitted, setMetaPubSubmitted])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!orgName.trim() || !showName.trim() || isLoading || isCheckingMetaPub) return

    setIsLoading(true)
    try {
      let avatarUrl: string | undefined
      if (avatarFile) {
        try {
          avatarUrl = await api.storage.uploadFile(avatarFile)
        } catch {
          // avatar upload failure is non-critical
        }
      }

      const org = await api.organization.createOrganization({
        orgName: orgName.trim(),
        showName: showName.trim(),
        avatarUrl,
        ...(referralCode.trim() ? { referralCode: referralCode.trim() } : {}),
      })

      // Fetch orgs to get member info so OrgGuard passes
      const orgs = await getOrganizations()
      const match = orgs.find(o => o.organization.orgId === org.orgId)
      if (match) {
        setCurrentOrg(org.orgId, match.member)
      } else {
        localStorage.setItem('organizationId', org.orgId)
        useOrganizationStore.setState({ currentOrgId: org.orgId })
      }

      onNext(orgName, {
        redirectToBindWallet: metaPubSubmitted === false && shouldReceivePayroll,
      })
    } catch (error) {
      console.error('Failed to create organization:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-full w-full flex-col items-center justify-center px-2.5 py-4 sm:px-4 sm:py-10 lg:px-[80px] lg:py-[80px]">
      {/* 卡片 */}
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-[480px] flex-col gap-4 rounded-[20px] bg-white p-4 shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] sm:gap-[24px] sm:rounded-[32px] sm:p-[28px] lg:w-[480px] lg:shrink-0"
      >
        {/* 角色 badge 区域 */}
        <div className="flex flex-col gap-3 rounded-[16px] bg-[rgba(94,133,238,0.08)] p-3 sm:gap-[20px] sm:rounded-[24px] sm:p-[20px]">
          <div className="flex items-center justify-center self-start rounded-full bg-white px-[16px] py-[8px]">
            <span className="font-['Inter',sans-serif] text-[20px] font-bold leading-[30px] text-[#1c1c26]">
              {copy.createOrganization.role}
            </span>
          </div>
          <p className="font-['Inter',sans-serif] text-[16px] font-normal leading-[24px] text-[#606067]">
            {copy.createOrganization.description}
          </p>
        </div>

        {/* Avatar upload */}
        <ImageCropUpload
          imageUrl={avatarPreview}
          alt="avatar"
          fallback={showName?.[0]?.toUpperCase() || '?'}
          variant="avatar"
          helperText={copy.createOrganization.uploadAvatar}
          acceptedMimeTypes={['image/png', 'image/jpeg']}
          previewWrapperClassName="h-[72px] w-[72px]"
          onCropped={({ file, previewUrl }) => {
            setAvatarFile(file)
            setAvatarPreview(previewUrl)
          }}
        />

        {/* Display Name 输入框 */}
        <input
          type="text"
          value={showName}
          onChange={e => setShowName(e.target.value)}
          placeholder={copy.createOrganization.displayNamePlaceholder}
          required
          className="min-h-[46px] w-full rounded-[12px] bg-[#f5f5f5] px-3 py-2.5 font-['Inter',sans-serif] text-[14px] leading-[20px] text-[#1c1c26] placeholder:text-[#bbbbbe] focus:outline-none sm:min-h-[52px] sm:rounded-[12px] sm:px-[16px] sm:py-0 sm:text-[16px] sm:leading-[24px]"
        />

        {/* Organization Name 输入框 */}
        <input
          type="text"
          value={orgName}
          onChange={e => setOrgName(e.target.value)}
          placeholder={copy.createOrganization.organizationNamePlaceholder}
          required
          className="min-h-[46px] w-full rounded-[12px] bg-[#f5f5f5] px-3 py-2.5 font-['Inter',sans-serif] text-[14px] leading-[20px] text-[#1c1c26] placeholder:text-[#bbbbbe] focus:outline-none sm:min-h-[52px] sm:rounded-[12px] sm:px-[16px] sm:py-0 sm:text-[16px] sm:leading-[24px]"
        />

        {/* Referral Code 输入框（可选） */}
        <div className="flex flex-col gap-[6px]">
          <input
            type="text"
            value={referralCode}
            onChange={e => setReferralCode(e.target.value)}
            placeholder={copy.createOrganization.referralCodePlaceholder}
            className="min-h-[46px] w-full rounded-[12px] bg-[#f5f5f5] px-3 py-2.5 font-['Inter',sans-serif] text-[14px] leading-[20px] text-[#1c1c26] placeholder:text-[#bbbbbe] focus:outline-none sm:min-h-[52px] sm:rounded-[12px] sm:px-[16px] sm:py-0 sm:text-[16px] sm:leading-[24px]"
          />
        </div>

        {metaPubSubmitted === false && (
          <div className="flex flex-col gap-[12px] rounded-[20px] border border-[rgba(94,133,238,0.18)] bg-[rgba(94,133,238,0.06)] p-[16px]">
            <p className="font-['Inter',sans-serif] text-[15px] font-bold leading-[22px] text-[#1c1c26]">
              {copy.createOrganization.receivePayrollTitle}
            </p>
            <label className="flex cursor-pointer items-start gap-[10px]">
              <input
                type="checkbox"
                checked={shouldReceivePayroll}
                onChange={e => setShouldReceivePayroll(e.target.checked)}
                className="mt-[3px] h-[18px] w-[18px] rounded border-[rgba(0,0,0,0.18)] text-[#5e85ee] focus:ring-[#5e85ee]"
              />
              <div className="flex flex-col gap-[2px]">
                <span className="font-['Inter',sans-serif] text-[14px] font-bold leading-[20px] text-[#1c1c26]">
                  {copy.createOrganization.receivePayrollLabel}
                </span>
                <span className="font-['Inter',sans-serif] text-[13px] leading-[20px] text-[#606067]">
                  {copy.createOrganization.receivePayrollDescription}
                </span>
              </div>
            </label>
          </div>
        )}

        {/* 按钮组 */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:gap-[12px]">
          <button
            type="button"
            onClick={onBack}
            disabled={isLoading}
            className="flex min-h-[44px] w-full shrink-0 items-center justify-center gap-[8px] rounded-[14px] border border-[rgba(0,0,0,0.12)] bg-white px-4 py-2.5 font-['Inter',sans-serif] text-[14px] font-bold leading-[20px] text-[#1c1c26] transition-colors hover:bg-[#f5f5f5] disabled:opacity-50 sm:min-h-0 sm:w-auto sm:rounded-[16px] sm:px-[24px] sm:py-[14px] sm:text-[16px] sm:leading-[24px]"
          >
            <IconArrowLeft className="h-[24px] w-[24px]" />
            <span>{copy.createOrganization.back}</span>
          </button>
          <button
            type="submit"
            disabled={!orgName.trim() || !showName.trim() || isLoading || isCheckingMetaPub}
            className="flex min-h-[44px] w-full flex-1 items-center justify-center rounded-[14px] bg-[#5e85ee] px-4 py-2.5 font-['Inter',sans-serif] text-[14px] font-bold leading-[20px] text-white transition-opacity hover:opacity-90 disabled:opacity-50 sm:min-h-0 sm:rounded-[16px] sm:px-[24px] sm:py-[14px] sm:text-[16px] sm:leading-[24px]"
          >
            {isLoading ? copy.createOrganization.creating : copy.createOrganization.create}
          </button>
        </div>
      </form>
    </div>
  )
}
