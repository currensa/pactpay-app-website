import { usePublicCopy } from '@/views/public/copy'

interface WelcomeSectionProps {
  onGetStarted: () => void
}

function ArrowRightIcon({ color = '#1c1c26' }: { color?: string }) {
  return (
    <svg
      className="h-[24px] w-[24px]"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5 12H19M19 12L13 6M19 12L13 18"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function WelcomeSection({ onGetStarted }: WelcomeSectionProps) {
  const { copy } = usePublicCopy()

  return (
    <div className="flex w-full flex-col items-start justify-between gap-8 px-1 py-2 lg:h-full lg:gap-0 lg:px-0 lg:py-0">
      <div className="flex flex-col gap-3 sm:gap-[16px]">
        <h1
          className="text-[clamp(36px,12vw,100px)] font-medium leading-[0.96] tracking-[-0.03em] text-[#1c1c26]"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          {copy.welcomeSection.heroTitle[0]}
          <br />
          {copy.welcomeSection.heroTitle[1]}
        </h1>
      </div>

      <button
        onClick={onGetStarted}
        className="flex min-h-[132px] w-full cursor-pointer items-end justify-between rounded-[20px] bg-[#5e85ee] px-5 pb-5 pt-5 transition-opacity hover:opacity-90 sm:min-h-[152px] sm:rounded-[24px] sm:px-[28px] sm:pb-[28px] sm:pt-[24px]"
      >
        <div className="flex flex-col items-start text-left text-white">
          <span className="text-[24px] font-bold leading-[32px] sm:text-[32px] sm:leading-[48px]">{copy.welcomeSection.ctaTitle}</span>
          <span className="max-w-[220px] text-[13px] leading-[20px] opacity-90 sm:max-w-none sm:text-[14px] sm:leading-[22px]">
            {copy.welcomeSection.ctaDescription}
          </span>
        </div>
        <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-white sm:h-[60px] sm:w-[60px]">
          <ArrowRightIcon color="#5e85ee" />
        </div>
      </button>
    </div>
  )
}
