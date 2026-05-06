import api from '@/apis'
import useAuthStore from '@/stores/auth'
import useOrganizationStore from '@/stores/organization'
import { IconArrowLeft, IconCamera } from '@tabler/icons-react'
import { FormEvent, useEffect, useRef, useState } from 'react'

interface CreateOrgStep1Props {
  onBack: () => void
  onNext: (orgName: string, options?: { redirectToBindWallet?: boolean }) => void
}

export default function CreateOrgStep1({ onBack, onNext }: CreateOrgStep1Props) {
  const [orgName, setOrgName] = useState('')
  const [showName, setShowName] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingMetaPub, setIsCheckingMetaPub] = useState(true)
  const [metaPubSubmitted, setMetaPubSubmittedState] = useState<boolean | null>(null)
  const [shouldReceivePayroll, setShouldReceivePayroll] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
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

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

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
    <div className="flex min-h-full w-full flex-col items-center justify-center px-4 py-[60px] lg:px-[80px] lg:py-[80px]">
      {/* 卡片 */}
      <form
        onSubmit={handleSubmit}
        className="flex w-full flex-col gap-[24px] rounded-[32px] bg-white p-[28px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] lg:w-[480px] lg:shrink-0"
      >
        {/* 角色 badge 区域 */}
        <div className="flex flex-col gap-[20px] rounded-[24px] bg-[rgba(94,133,238,0.08)] p-[20px]">
          <div className="flex items-center justify-center self-start rounded-full bg-white px-[16px] py-[8px]">
            <span className="font-['Inter',sans-serif] text-[20px] font-bold leading-[30px] text-[#1c1c26]">
              Administrator
            </span>
          </div>
          <p className="font-['Inter',sans-serif] text-[16px] font-normal leading-[24px] text-[#606067]">
            Create and manage an organization, set up payment plans, and pay contractors.
          </p>
        </div>

        {/* Avatar upload */}
        <div className="flex flex-col items-center gap-[6px]">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-[rgba(0,0,0,0.12)] bg-[#f5f5f5] transition-colors group hover:border-[#5e85ee]"
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="avatar" className="h-full w-full object-cover" />
            ) : (
              <IconCamera className="h-[24px] w-[24px] text-[#8d8d93] group-hover:text-[#5e85ee] transition-colors" />
            )}
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <IconCamera className="h-[20px] w-[20px] text-white" />
            </div>
          </button>
          <p className="text-[12px] leading-[18px] text-[#8d8d93]">Upload avatar (optional)</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

        {/* Display Name 输入框 */}
        <input
          type="text"
          value={showName}
          onChange={e => setShowName(e.target.value)}
          placeholder="Enter your display name"
          required
          className="h-[52px] w-full rounded-[12px] bg-[#f5f5f5] px-[16px] font-['Inter',sans-serif] text-[16px] leading-[24px] text-[#1c1c26] placeholder:text-[#bbbbbe] focus:outline-none"
        />

        {/* Organization Name 输入框 */}
        <input
          type="text"
          value={orgName}
          onChange={e => setOrgName(e.target.value)}
          placeholder="Enter Organization Name"
          required
          className="h-[52px] w-full rounded-[12px] bg-[#f5f5f5] px-[16px] font-['Inter',sans-serif] text-[16px] leading-[24px] text-[#1c1c26] placeholder:text-[#bbbbbe] focus:outline-none"
        />

        {/* Referral Code 输入框（可选） */}
        <div className="flex flex-col gap-[6px]">
          <input
            type="text"
            value={referralCode}
            onChange={e => setReferralCode(e.target.value)}
            placeholder="Enter referral code (optional)"
            className="h-[52px] w-full rounded-[12px] bg-[#f5f5f5] px-[16px] font-['Inter',sans-serif] text-[16px] leading-[24px] text-[#1c1c26] placeholder:text-[#bbbbbe] focus:outline-none"
          />
        </div>

        {metaPubSubmitted === false && (
          <div className="flex flex-col gap-[12px] rounded-[20px] border border-[rgba(94,133,238,0.18)] bg-[rgba(94,133,238,0.06)] p-[16px]">
            <p className="font-['Inter',sans-serif] text-[15px] font-bold leading-[22px] text-[#1c1c26]">
              Will you also receive payments from this organisation?
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
                  Yes, add me as a member
                </span>
                <span className="font-['Inter',sans-serif] text-[13px] leading-[20px] text-[#606067]">
                  I'll also receive payroll from this organisation
                </span>
              </div>
            </label>
          </div>
        )}

        {/* 按钮组 */}
        <div className="flex gap-[12px]">
          <button
            type="button"
            onClick={onBack}
            disabled={isLoading}
            className="flex shrink-0 items-center justify-center gap-[8px] rounded-[16px] border border-[rgba(0,0,0,0.12)] bg-white px-[24px] py-[14px] font-['Inter',sans-serif] text-[16px] font-bold leading-[24px] text-[#1c1c26] transition-colors hover:bg-[#f5f5f5] disabled:opacity-50"
          >
            <IconArrowLeft className="h-[24px] w-[24px]" />
            <span>Back</span>
          </button>
          <button
            type="submit"
            disabled={!orgName.trim() || !showName.trim() || isLoading || isCheckingMetaPub}
            className="flex flex-1 items-center justify-center rounded-[16px] bg-[#5e85ee] px-[24px] py-[14px] font-['Inter',sans-serif] text-[16px] font-bold leading-[24px] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isLoading ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  )
}
