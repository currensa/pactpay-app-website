import api from '@/apis'
import { INVITE_CODE_SESSION_KEY } from '@/views/account/join-invite'
import { IconArrowLeft, IconCamera, IconLoader2 } from '@tabler/icons-react'
import { useRef, useState } from 'react'

interface JoinOrganizationProps {
  onBack: () => void
  onJoin: () => void
  initialCode?: string
}

export default function JoinOrganization({ onBack, onJoin, initialCode }: JoinOrganizationProps) {
  const [orgCode, setOrgCode] = useState(initialCode ?? '')
  const [showName, setShowName] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [joinLoading, setJoinLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleJoin = async () => {
    if (!orgCode.trim() || !showName.trim()) return
    setError('')
    setJoinLoading(true)
    try {
      let avatarUrl: string | undefined
      if (avatarFile) {
        try {
          avatarUrl = await api.storage.uploadFile(avatarFile)
        } catch {
          // avatar upload failure is non-critical
        }
      }

      await api.organization.joinOrganization({ code: orgCode.trim(), showName: showName.trim(), avatarUrl })
      sessionStorage.removeItem(INVITE_CODE_SESSION_KEY)
      onJoin()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to join. Please check your code and try again.')
    } finally {
      setJoinLoading(false)
    }
  }

  return (
    <div className="flex min-h-full w-full flex-col items-center justify-center px-4 py-[60px] lg:px-[80px] lg:py-[80px]">
      {/* 卡片 */}
      <div className="flex w-full flex-col gap-[32px] rounded-[32px] bg-white p-[32px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] lg:w-[480px] lg:shrink-0">
        {/* 角色 badge 区域 */}
        <div className="flex flex-col gap-[32px] rounded-[24px] bg-[#f5f5f5] p-[24px]">
          <div className="flex items-center justify-center self-start rounded-full bg-white px-[16px] py-[8px]">
            <span className="font-['Inter',sans-serif] text-[20px] font-bold leading-[30px] text-[#1c1c26]">
              Member
            </span>
          </div>
          <p className="font-['Inter',sans-serif] text-[16px] font-normal leading-[24px] text-[#606067]">
            Join an organization to receive payments and view transaction history.
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
        <div className="flex flex-col gap-[8px]">
          <input
            type="text"
            value={showName}
            onChange={e => setShowName(e.target.value)}
            placeholder="Enter your display name"
            className="h-[56px] w-full rounded-[12px] bg-[#f5f5f5] px-[16px] font-['Inter',sans-serif] text-[16px] leading-[24px] text-[#1c1c26] placeholder:text-[#bbbbbe] focus:outline-none"
          />
        </div>

        {/* Organization Code 输入 + 提示 */}
        <div className="flex flex-col gap-[8px]">
          <input
            type="text"
            value={orgCode}
            onChange={e => { if (!initialCode) setOrgCode(e.target.value) }}
            readOnly={!!initialCode}
            placeholder="Enter Organization Code"
            className={`h-[56px] w-full rounded-[12px] bg-[#f5f5f5] px-[16px] font-['Inter',sans-serif] text-[16px] leading-[24px] text-[#1c1c26] placeholder:text-[#bbbbbe] focus:outline-none ${initialCode ? 'cursor-default select-none text-[#8d8d93]' : ''}`}
          />
          <p className="font-['Inter',sans-serif] text-[14px] leading-[22px] text-[#8d8d93]">
            {"Don't have a code? Ask your organization admin for an invite link or code."}
          </p>
        </div>

        {error && <p className="text-[14px] leading-[22px] text-red-500">{error}</p>}

        {/* 按钮组 */}
        <div className="flex gap-[12px]">
          <button
            type="button"
            onClick={onBack}
            className="flex shrink-0 items-center justify-center gap-[8px] rounded-[16px] border border-[rgba(0,0,0,0.12)] bg-white px-[24px] py-[16px] font-['Inter',sans-serif] text-[16px] font-bold leading-[24px] text-[#1c1c26] transition-colors hover:bg-[#f5f5f5]"
          >
            <IconArrowLeft className="h-[24px] w-[24px]" />
            <span>Back</span>
          </button>
          <button
            type="button"
            disabled={!orgCode.trim() || !showName.trim() || joinLoading}
            onClick={handleJoin}
            className="flex flex-1 items-center justify-center gap-[8px] rounded-[16px] bg-[#5e85ee] px-[24px] py-[16px] font-['Inter',sans-serif] text-[16px] font-bold leading-[24px] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {joinLoading ? (
              <IconLoader2 className="h-[24px] w-[24px] animate-spin" />
            ) : (
              <span>Join Organization</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
