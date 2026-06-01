import { usePublicCopy } from '@/views/public/copy'

interface IdentitySelectionProps {
  onSelect: (role: 'admin' | 'member') => void
}

export default function IdentitySelection({ onSelect }: IdentitySelectionProps) {
  const { copy } = usePublicCopy()

  return (
    <div className="flex min-h-full w-full flex-col items-center justify-center gap-8 px-3 py-6 sm:px-4 sm:py-10 lg:gap-[80px] lg:px-[80px] lg:py-[80px]">
      <div className="text-center font-['Poppins',sans-serif]">
        <p className="text-[24px] leading-[32px] tracking-[-0.48px] text-[#bbbbbe] sm:text-[32px] sm:leading-[42px] sm:tracking-[-0.64px] lg:text-[56px] lg:leading-[68px] lg:tracking-[-1.12px]">
          {copy.identity.titleTop}
        </p>
        <p className="text-[40px] font-medium leading-none tracking-[-0.8px] text-[#1c1c26] sm:text-[56px] sm:tracking-[-1.12px] lg:text-[100px] lg:tracking-[-2px]">
          {copy.identity.titleBottom}
        </p>
      </div>

      <div className="flex w-full max-w-[1040px] flex-col items-stretch gap-4 sm:gap-6 lg:flex-row lg:items-start lg:justify-center lg:gap-[32px]">
        <div className="flex w-full flex-col gap-5 rounded-[24px] bg-white p-5 shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] sm:gap-[32px] sm:rounded-[32px] sm:p-[32px] lg:w-[480px] lg:shrink-0">
          <div className="flex flex-col gap-5 rounded-[20px] bg-[rgba(94,133,238,0.08)] p-4 sm:gap-[32px] sm:rounded-[24px] sm:p-[24px]">
            <div className="flex items-center justify-center self-start rounded-full bg-white px-[16px] py-[8px]">
              <span className="font-['Inter',sans-serif] text-[18px] font-bold leading-[28px] text-[#1c1c26] sm:text-[20px] sm:leading-[30px]">
                {copy.identity.organization}
              </span>
            </div>
            <p className="font-['Inter',sans-serif] text-[16px] leading-[24px] text-[#606067]">
              {copy.identity.organizationDescription}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSelect('admin')}
            className="flex w-full items-center justify-center rounded-full bg-[#5e85ee] px-[24px] py-[16px] font-['Inter',sans-serif] text-[16px] font-bold leading-[24px] text-white transition-opacity hover:opacity-90"
          >
            {copy.identity.createOrganization}
          </button>
        </div>

        <div className="flex w-full flex-col gap-5 rounded-[24px] bg-white p-5 shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] sm:gap-[32px] sm:rounded-[32px] sm:p-[32px] lg:w-[480px] lg:shrink-0">
          <div className="flex flex-col gap-5 rounded-[20px] bg-[#f5f5f5] p-4 sm:gap-[32px] sm:rounded-[24px] sm:p-[24px]">
            <div className="flex items-center justify-center self-start rounded-full bg-white px-[16px] py-[8px]">
              <span className="font-['Inter',sans-serif] text-[18px] font-bold leading-[28px] text-[#1c1c26] sm:text-[20px] sm:leading-[30px]">
                {copy.identity.member}
              </span>
            </div>
            <p className="font-['Inter',sans-serif] text-[16px] leading-[24px] text-[#606067]">
              {copy.identity.memberDescription}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSelect('member')}
            className="flex w-full items-center justify-center rounded-full bg-[#5e85ee] px-[24px] py-[16px] font-['Inter',sans-serif] text-[16px] font-bold leading-[24px] text-white transition-opacity hover:opacity-90"
          >
            {copy.identity.joinOrganization}
          </button>
        </div>
      </div>
    </div>
  )
}
