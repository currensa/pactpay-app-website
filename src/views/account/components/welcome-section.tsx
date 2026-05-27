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
    <div className="flex h-full w-full flex-col items-start justify-between">
      <div className="flex flex-col gap-[16px]">
        <h1
          className="text-[clamp(48px,5.5vw,100px)] font-medium leading-[1] tracking-[-0.02em] text-[#1c1c26]"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          {copy.welcomeSection.heroTitle[0]}
          <br />
          {copy.welcomeSection.heroTitle[1]}
        </h1>
      </div>

      <button
        onClick={onGetStarted}
        className="flex w-full cursor-pointer items-end justify-between rounded-[24px] bg-[#5e85ee] px-[28px] pb-[28px] pt-[24px] transition-opacity hover:opacity-90"
      >
        <div className="flex flex-col items-start text-left text-white">
          <span className="text-[32px] font-bold leading-[48px]">{copy.welcomeSection.ctaTitle}</span>
          <span className="text-[14px] leading-[22px] opacity-90">
            {copy.welcomeSection.ctaDescription}
          </span>
        </div>
        <div className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full bg-white">
          <ArrowRightIcon color="#5e85ee" />
        </div>
      </button>
    </div>
  )
}
