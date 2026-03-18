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
  return (
    <div className="flex h-full w-full flex-col items-start justify-between py-2">
      {/* 顶部内容区 */}
      <div className="flex flex-col gap-[16px]">
        {/* Create Organization 标签 */}
        {/* <div className="flex w-fit items-center gap-[8px] rounded-full border border-black/12 px-[14px] py-[6px]">
          <span className="text-[16px] leading-[24px] text-[#1c1c26]">Create Organization</span>
          <ArrowRightIcon />
        </div> */}

        {/* 主标题 */}
        <h1
          className="text-[clamp(48px,5.5vw,100px)] font-medium leading-[1] tracking-[-0.02em] text-[#1c1c26]"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          Pay smarter,{' '}
          <br />
          not harder.
        </h1>

        {/* 副标题 */}
        <p
          className="text-[clamp(22px,2.8vw,48px)] leading-[1.25] tracking-[-0.02em] text-[#bbbbbe]"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          Automated Web3 payments.
          <br />
          Non-custodial, transparent, effortless.
        </p>
      </div>

      {/* Get Started 按钮卡片 */}
      <button
        onClick={onGetStarted}
        className="flex w-full cursor-pointer items-end justify-between rounded-[24px] bg-[#5e85ee] px-[28px] pb-[28px] pt-[24px] transition-opacity hover:opacity-90"
      >
        <div className="flex flex-col items-start text-left text-white">
          <span className="text-[32px] font-bold leading-[48px]">Get Started</span>
          <span className="text-[14px] leading-[22px] opacity-90">
            Connect your wallet or sign in with email to get started
          </span>
        </div>
        <div className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full bg-white">
          <ArrowRightIcon color="#5e85ee" />
        </div>
      </button>
    </div>
  )
}
