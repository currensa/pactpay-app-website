import { IconArrowRight, IconWallet } from '@tabler/icons-react'
import { useState } from 'react'

interface IdentitySelectionProps {
  onSelect: (role: 'admin' | 'member') => void
}

export default function IdentitySelection({ onSelect }: IdentitySelectionProps) {
  const [selectedRole, setSelectedRole] = useState<'admin' | 'member' | null>('admin')

  const handleContinue = () => {
    if (selectedRole) {
      onSelect(selectedRole)
    }
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col items-center justify-center overflow-hidden px-4 py-6 lg:px-[80px] lg:py-[80px]">
      <div className="flex w-full max-w-[480px] flex-1 min-h-0 flex-col items-center justify-center gap-6 lg:gap-10">
        {/* 标题 - Figma: Poppins Regular 40px / Poppins Medium 76px */}
        <div className="shrink-0 text-center font-['Poppins',sans-serif]">
          <p className="text-[28px] leading-[36px] tracking-[-0.56px] text-[#bbbbbe] lg:text-[40px] lg:leading-[50px] lg:tracking-[-0.8px]">
            How do you want to
          </p>
          <p className="font-medium leading-none tracking-[-0.72px] text-[#1c1c26] text-[40px] lg:text-[76px] lg:tracking-[-1.52px]">
            use PactPay
          </p>
        </div>

        {/* 选项区域 - Figma: 480px 宽，间距适度缩小以适配容器不出现滚动条 */}
        <div className="flex w-full max-w-[480px] shrink-0 flex-col items-stretch gap-5 lg:gap-6">
          <div className="flex flex-col gap-5 lg:gap-6">
            {/* Administrator 选项 - Figma: rounded-[24px] p-[24px] gap-[8px], Inter Bold 20px/30px, Inter Regular 16px/24px */}
            <button
              type="button"
              onClick={() => setSelectedRole('admin')}
              className={`flex w-full flex-col items-start gap-[8px] rounded-[24px] border p-[24px] text-left transition-colors ${selectedRole === 'admin'
                ? 'border-[#5e85ee] bg-[rgba(94,133,238,0.12)]'
                : 'border-[rgba(0,0,0,0.12)] bg-white hover:border-[#5e85ee]/50'
                }`}
            >
              <div className="flex w-full items-center justify-between">
                <span className="font-['Inter',sans-serif] text-[20px] font-bold leading-[30px] text-[#1c1c26]">
                  Administrator
                </span>
                {selectedRole === 'admin' && (
                  <IconArrowRight className="h-6 w-6 shrink-0 text-[#1c1c26]" aria-hidden />
                )}
              </div>
              <p className="font-['Inter',sans-serif] text-[16px] font-normal leading-[24px] text-[#606067]">
                Create and manage an organization, set up payment plans, and pay contractors.
              </p>
            </button>

            {/* Member 选项 - 选中时显示箭头 */}
            <button
              type="button"
              onClick={() => setSelectedRole('member')}
              className={`flex w-full flex-col items-start gap-[8px] rounded-[24px] border p-[24px] text-left transition-colors ${selectedRole === 'member'
                ? 'border-[#5e85ee] bg-[rgba(94,133,238,0.12)]'
                : 'border-[rgba(0,0,0,0.12)] bg-white hover:border-[#5e85ee]/50'
                }`}
            >
              <div className="flex w-full items-center justify-between">
                <span className="font-['Inter',sans-serif] text-[20px] font-bold leading-[30px] text-[#1c1c26]">
                  Member
                </span>
                {selectedRole === 'member' && (
                  <IconArrowRight className="h-6 w-6 shrink-0 text-[#1c1c26]" aria-hidden />
                )}
              </div>
              <p className="font-['Inter',sans-serif] text-[16px] font-normal leading-[24px] text-[#606067]">
                Join an organization to receive payments and view transaction history.
              </p>
            </button>
          </div>

          {/* Continue 按钮 - Figma: rounded-[360px] px-[24px] py-[14px] gap-[8px], Inter Bold 16px/24px, wallet 图标 */}
          <button
            type="button"
            onClick={handleContinue}
            disabled={!selectedRole}
            className="flex items-center justify-center gap-[8px] rounded-[360px] bg-[#875dff] px-[24px] py-[14px] font-['Inter',sans-serif] text-[16px] font-bold leading-[24px] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <IconWallet className="h-6 w-6 shrink-0" aria-hidden />
            <span>Continue</span>
          </button>
        </div>
      </div>
    </div>
  )
}
