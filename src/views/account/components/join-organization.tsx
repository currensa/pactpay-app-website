import api from '@/apis'
import { IconArrowLeft, IconLoader2 } from '@tabler/icons-react'
import { useState } from 'react'

interface JoinOrganizationProps {
  onBack: () => void
  onJoin: () => void
}

export default function JoinOrganization({ onBack, onJoin }: JoinOrganizationProps) {
  const [orgCode, setOrgCode] = useState('')
  const [showName, setShowName] = useState('')
  const [joinLoading, setJoinLoading] = useState(false)
  const [error, setError] = useState('')

  const handleJoin = async () => {
    if (!orgCode.trim() || !showName.trim()) return
    setError('')
    setJoinLoading(true)
    try {
      await api.organization.joinOrganization({ code: orgCode.trim(), showName: showName.trim() })
      onJoin()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to join. Please check your code and try again.')
    } finally {
      setJoinLoading(false)
    }
  }

  return (
    <div className="flex h-full w-full flex-col gap-[60px] px-4 py-8 lg:gap-[80px] lg:px-[80px] lg:py-[80px]">
      <h1 className="w-full max-w-[480px] text-[28px] font-bold leading-[42px] text-[#1c1c26] lg:text-[32px] lg:leading-[48px]">
        Join an Organization
      </h1>

      <div className="flex w-full flex-col gap-[32px]">
        <div className="flex flex-col gap-[8px]">
          <label htmlFor="showName" className="text-[16px] leading-[24px] text-[#1c1c26]">
            Display Name <span className="text-red-500">*</span>
          </label>
          <div className="flex h-[38px] items-center overflow-hidden rounded-[6px] border border-[#d9d9db] bg-white px-[12px] py-[4px]">
            <input
              id="showName"
              type="text"
              value={showName}
              onChange={e => setShowName(e.target.value)}
              placeholder="Enter your display name"
              className="flex-1 text-[14px] leading-[22px] text-[#1c1c26] placeholder:text-[rgba(19,19,26,0.2)] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col gap-[8px]">
          <label htmlFor="orgCode" className="text-[16px] leading-[24px] text-[#1c1c26]">
            Organization Code <span className="text-red-500">*</span>
          </label>
          <div className="flex h-[38px] items-center overflow-hidden rounded-[6px] border border-[#d9d9db] bg-white px-[12px] py-[4px]">
            <input
              id="orgCode"
              type="text"
              value={orgCode}
              onChange={e => setOrgCode(e.target.value)}
              placeholder="Enter Organization Code"
              className="flex-1 text-[14px] leading-[22px] text-[#1c1c26] placeholder:text-[rgba(19,19,26,0.2)] focus:outline-none"
            />
          </div>
          <p className="text-[14px] leading-[22px] text-[#8d8d93]">
            Don't have a code? Ask your organization admin for an invite link or code.
          </p>
        </div>

        {error && <p className="text-[14px] text-red-500">{error}</p>}

        <div className="flex flex-col gap-[12px] sm:flex-row">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center justify-center gap-[8px] rounded-full border border-[#d9d9db] bg-white px-[24px] py-[14px] text-[16px] font-bold leading-[24px] text-[#1c1c26] transition-opacity hover:opacity-90"
          >
            <IconArrowLeft className="h-[24px] w-[24px]" />
            <span>Back</span>
          </button>
          <button
            type="button"
            disabled={!orgCode.trim() || !showName.trim() || joinLoading}
            onClick={handleJoin}
            className="flex flex-1 items-center justify-center gap-[8px] rounded-full bg-[#875dff] px-[24px] py-[14px] text-[16px] font-bold leading-[24px] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
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
