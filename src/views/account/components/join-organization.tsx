import api from '@/apis'
import { ImageCropUpload } from '@/components/app/image-crop-upload'
import { INVITE_CODE_SESSION_KEY } from '@/views/account/join-invite'
import { usePublicCopy } from '@/views/public/copy'
import { IconArrowLeft, IconLoader2 } from '@tabler/icons-react'
import { useState } from 'react'

interface JoinOrganizationProps {
  onBack: () => void
  onJoin: () => void
  initialCode?: string
}

export default function JoinOrganization({ onBack, onJoin, initialCode }: JoinOrganizationProps) {
  const { copy } = usePublicCopy()
  const [orgCode, setOrgCode] = useState(initialCode ?? '')
  const [showName, setShowName] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [joinLoading, setJoinLoading] = useState(false)

  const handleJoin = async () => {
    if (!orgCode.trim() || !showName.trim()) return
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
    } catch {
      // request interceptor handles API errors
    } finally {
      setJoinLoading(false)
    }
  }

  return (
    <div className="flex min-h-full w-full flex-col items-center justify-center px-2.5 py-4 sm:px-4 sm:py-10 lg:px-[80px] lg:py-[80px]">
      {/* 卡片 */}
      <div className="flex w-full max-w-[480px] flex-col gap-4 rounded-[20px] bg-white p-4 shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] sm:gap-[32px] sm:rounded-[32px] sm:p-[32px] lg:w-[480px] lg:shrink-0">
        {/* 角色 badge 区域 */}
        <div className="flex flex-col gap-3 rounded-[16px] bg-[#f5f5f5] p-3 sm:gap-[32px] sm:rounded-[24px] sm:p-[24px]">
          <div className="flex items-center justify-center self-start rounded-full bg-white px-[16px] py-[8px]">
            <span className="font-['Inter',sans-serif] text-[20px] font-bold leading-[30px] text-[#1c1c26]">
              {copy.joinOrganization.role}
            </span>
          </div>
          <p className="font-['Inter',sans-serif] text-[16px] font-normal leading-[24px] text-[#606067]">
            {copy.joinOrganization.description}
          </p>
        </div>

        {/* Avatar upload */}
        <ImageCropUpload
          imageUrl={avatarPreview}
          alt="avatar"
          fallback={showName?.[0]?.toUpperCase() || '?'}
          variant="avatar"
          helperText={copy.joinOrganization.uploadAvatar}
          acceptedMimeTypes={['image/png', 'image/jpeg']}
          previewWrapperClassName="h-[80px] w-[80px]"
          onCropped={({ file, previewUrl }) => {
            setAvatarFile(file)
            setAvatarPreview(previewUrl)
          }}
        />

        {/* Display Name 输入框 */}
        <div className="flex flex-col gap-[8px]">
          <input
            type="text"
            value={showName}
            onChange={e => setShowName(e.target.value)}
            placeholder={copy.joinOrganization.displayNamePlaceholder}
            className="min-h-[46px] w-full rounded-[12px] bg-[#f5f5f5] px-3 py-2.5 font-['Inter',sans-serif] text-[14px] leading-[20px] text-[#1c1c26] placeholder:text-[#bbbbbe] focus:outline-none sm:rounded-[12px] sm:px-[16px] sm:py-0 sm:text-[16px] sm:leading-[24px]"
          />
        </div>

        {/* Organization Code 输入 + 提示 */}
        <div className="flex flex-col gap-[8px]">
          <input
            type="text"
            value={orgCode}
            onChange={e => { if (!initialCode) setOrgCode(e.target.value) }}
            readOnly={!!initialCode}
            placeholder={copy.joinOrganization.organizationCodePlaceholder}
            className={`min-h-[46px] w-full rounded-[12px] bg-[#f5f5f5] px-3 py-2.5 font-['Inter',sans-serif] text-[14px] leading-[20px] text-[#1c1c26] placeholder:text-[#bbbbbe] focus:outline-none sm:rounded-[12px] sm:px-[16px] sm:py-0 sm:text-[16px] sm:leading-[24px] ${initialCode ? 'cursor-default select-none text-[#8d8d93]' : ''}`}
          />
          <p className="font-['Inter',sans-serif] text-[14px] leading-[22px] text-[#8d8d93]">
            {copy.joinOrganization.codeHelp}
          </p>
        </div>

        {/* 按钮组 */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:gap-[12px]">
          <button
            type="button"
            onClick={onBack}
            className="flex min-h-[44px] w-full shrink-0 items-center justify-center gap-[8px] rounded-[14px] border border-[rgba(0,0,0,0.12)] bg-white px-4 py-2.5 font-['Inter',sans-serif] text-[14px] font-bold leading-[20px] text-[#1c1c26] transition-colors hover:bg-[#f5f5f5] sm:min-h-0 sm:w-auto sm:rounded-[16px] sm:px-[24px] sm:py-[16px] sm:text-[16px] sm:leading-[24px]"
          >
            <IconArrowLeft className="h-[24px] w-[24px]" />
            <span>{copy.joinOrganization.back}</span>
          </button>
          <button
            type="button"
            disabled={!orgCode.trim() || !showName.trim() || joinLoading}
            onClick={handleJoin}
            className="flex min-h-[44px] w-full flex-1 items-center justify-center gap-[8px] rounded-[14px] bg-[#5e85ee] px-4 py-2.5 font-['Inter',sans-serif] text-[14px] font-bold leading-[20px] text-white transition-opacity hover:opacity-90 disabled:opacity-50 sm:min-h-0 sm:rounded-[16px] sm:px-[24px] sm:py-[16px] sm:text-[16px] sm:leading-[24px]"
          >
            {joinLoading ? (
              <IconLoader2 className="h-[24px] w-[24px] animate-spin" />
            ) : (
              <span>{copy.joinOrganization.join}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
