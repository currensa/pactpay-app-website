import api from '@/apis'
import { IconArrowLeft } from '@tabler/icons-react'
import { FormEvent, useState } from 'react'

interface CreateOrgStep1Props {
  onBack: () => void
  onNext: (orgName: string) => void
}

export default function CreateOrgStep1({ onBack, onNext }: CreateOrgStep1Props) {
  const [orgName, setOrgName] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!orgName.trim() || isLoading) return

    setIsLoading(true)
    try {
      const org = await api.organization.createOrganization({ orgName: orgName.trim() })
      localStorage.setItem('organizationId', org.orgId)
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

        {/* 输入框 */}
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
            disabled={!orgName.trim() || isLoading}
            className="flex flex-1 items-center justify-center rounded-[16px] bg-[#5e85ee] px-[24px] py-[16px] font-['Inter',sans-serif] text-[16px] font-bold leading-[24px] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isLoading ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  )
}
