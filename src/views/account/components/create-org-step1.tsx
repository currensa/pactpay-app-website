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
    <div className="flex h-full w-full flex-col gap-[60px] px-4 py-8 lg:gap-[80px] lg:px-[80px] lg:py-[80px]">
      {/* 标题 */}
      <h1 className="w-full max-w-[480px] text-[28px] font-bold leading-[42px] text-[#1c1c26] lg:text-[32px] lg:leading-[48px]">
        Create Organization
      </h1>

      {/* 进度条 */}
      <div className="relative h-[16px] w-full max-w-[480px]">
        <div className="absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 bg-[#e5e5e5]" />
        <div className="absolute left-0 top-1/2 h-[2px] w-0 -translate-y-1/2 bg-[#5e85ee] transition-all duration-300" />
        <div className="absolute left-0 top-1/2 h-[12px] w-[12px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-[#5e85ee] bg-white" />
        <div className="absolute right-0 top-1/2 h-[12px] w-[12px] translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-[#d9d9db] bg-white" />
      </div>

      {/* 表单 */}
      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-[32px]">
        {/* 组织名称输入 */}
        <div className="flex flex-col gap-[8px]">
          <label htmlFor="orgName" className="text-[16px] leading-[24px] text-[#1c1c26]">
            Organization Name
          </label>
          <div className="flex h-[38px] items-center overflow-hidden rounded-[6px] border border-[#d9d9db] bg-white px-[12px] py-[4px]">
            <input
              id="orgName"
              type="text"
              value={orgName}
              onChange={e => setOrgName(e.target.value)}
              placeholder="Enter Organization Name"
              className="flex-1 text-[14px] leading-[22px] text-[#1c1c26] placeholder:text-[rgba(19,19,26,0.2)] focus:outline-none"
              required
            />
          </div>
        </div>

        {/* 按钮组 */}
        <div className="flex flex-col gap-[12px] sm:flex-row">
          <button
            type="button"
            onClick={onBack}
            disabled={isLoading}
            className="flex items-center justify-center gap-[8px] rounded-full border border-[#d9d9db] bg-white px-[24px] py-[14px] text-[16px] font-bold leading-[24px] text-[#1c1c26] transition-colors hover:bg-[#f5f5f5] disabled:opacity-50"
          >
            <IconArrowLeft className="h-[24px] w-[24px]" />
            <span>Back</span>
          </button>

          <button
            type="submit"
            disabled={!orgName.trim() || isLoading}
            className="flex flex-1 items-center justify-center rounded-full bg-[#5e85ee] px-[24px] py-[14px] text-[16px] font-bold leading-[24px] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <span>{isLoading ? 'Creating...' : 'Continue'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
