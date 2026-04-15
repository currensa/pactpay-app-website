import api from '@/apis'
import useOrganizationStore from '@/stores/organization'
import { IconArrowLeft, IconCamera } from '@tabler/icons-react'
import { FormEvent, useRef, useState } from 'react'

interface CreateOrgStep1Props {
  onBack: () => void
  onNext: (orgName: string) => void
}

export default function CreateOrgStep1({ onBack, onNext }: CreateOrgStep1Props) {
  const [orgName, setOrgName] = useState('')
  const [showName, setShowName] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const setCurrentOrg = useOrganizationStore(s => s.setCurrentOrg)

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!orgName.trim() || !showName.trim() || isLoading) return

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
      })

      // Fetch orgs to get member info so OrgGuard passes
      const orgs = await api.organization.getOrganizations()
      const match = orgs.find(o => o.organization.orgId === org.orgId)
      if (match) {
        setCurrentOrg(org.orgId, match.member)
      } else {
        localStorage.setItem('organizationId', org.orgId)
        useOrganizationStore.setState({ currentOrgId: org.orgId })
      }

      onNext(orgName)
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
        className="flex w-full flex-col gap-[32px] rounded-[32px] bg-white p-[32px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] lg:w-[480px] lg:shrink-0"
      >
        {/* 角色 badge 区域 */}
        <div className="flex flex-col gap-[32px] rounded-[24px] bg-[rgba(94,133,238,0.08)] p-[24px]">
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
        <div className="flex flex-col items-center gap-[8px]">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative h-[80px] w-[80px] rounded-full bg-[#f5f5f5] overflow-hidden flex items-center justify-center border-2 border-dashed border-[rgba(0,0,0,0.12)] hover:border-[#5e85ee] transition-colors group"
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
          className="h-[56px] w-full rounded-[12px] bg-[#f5f5f5] px-[16px] font-['Inter',sans-serif] text-[16px] leading-[24px] text-[#1c1c26] placeholder:text-[#bbbbbe] focus:outline-none"
        />

        {/* Organization Name 输入框 */}
        <input
          type="text"
          value={orgName}
          onChange={e => setOrgName(e.target.value)}
          placeholder="Enter Organization Name"
          required
          className="h-[56px] w-full rounded-[12px] bg-[#f5f5f5] px-[16px] font-['Inter',sans-serif] text-[16px] leading-[24px] text-[#1c1c26] placeholder:text-[#bbbbbe] focus:outline-none"
        />

        {/* 按钮组 */}
        <div className="flex gap-[12px]">
          <button
            type="button"
            onClick={onBack}
            disabled={isLoading}
            className="flex shrink-0 items-center justify-center gap-[8px] rounded-[16px] border border-[rgba(0,0,0,0.12)] bg-white px-[24px] py-[16px] font-['Inter',sans-serif] text-[16px] font-bold leading-[24px] text-[#1c1c26] transition-colors hover:bg-[#f5f5f5] disabled:opacity-50"
          >
            <IconArrowLeft className="h-[24px] w-[24px]" />
            <span>Back</span>
          </button>
          <button
            type="submit"
            disabled={!orgName.trim() || !showName.trim() || isLoading}
            className="flex flex-1 items-center justify-center rounded-[16px] bg-[#5e85ee] px-[24px] py-[16px] font-['Inter',sans-serif] text-[16px] font-bold leading-[24px] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isLoading ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  )
}
