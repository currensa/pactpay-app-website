import imgArrowRightLg from '@/assets/home/arrow-right.svg'
import footicon1 from '@/assets/home/footicon1.svg'
import HomeSvg from '@/assets/home/HomeSvg'

import box1svg from '@/assets/home/home1box1.svg'
import box2svg from '@/assets/home/home2box1.svg'
import box3svg from '@/assets/home/home3box1.svg'
import box4svg from '@/assets/home/home4box1.svg'

import sicon1 from '@/assets/home/homessicon1.svg'
import sicon2 from '@/assets/home/homessicon2.svg'
import sicon3 from '@/assets/home/homessicon3.svg'
import sicon4 from '@/assets/home/homessicon4.svg'
import sicon5 from '@/assets/home/homessicon5.svg'
import sicon6 from '@/assets/home/homessicon6.svg'
import sicon7 from '@/assets/home/homessicon7.svg'




import { useNavigate } from 'react-router-dom'

const memberItems = [
  { text: 'Get paid directly — no middleman.', icon: sicon1 },
  { text: 'No ID. No bank. Your real address stays hidden.', icon: sicon2 },
  { text: 'Your earnings, traceable only by you.', icon: sicon3 },
]

const orgItems = [
  { text: 'Non-custodial by default. Always.', icon: sicon4 },
  { text: 'Pay your whole team in one transaction.', icon: sicon5 },
  { text: 'Define the rules. Sign. Done.', icon: sicon7 },
  { text: 'Zero link between addresses. Full privacy.', icon: sicon6 },
]

// Build a single flat list: header badge + items, duplicated for seamless loop
function buildTickerList() {
  return [
    { type: 'badge-member' as const },
    ...memberItems.map((item) => ({ type: 'item' as const, ...item })),
    { type: 'badge-org' as const },
    ...orgItems.map((item) => ({ type: 'item' as const, ...item })),
  ]
}

const tickerList = buildTickerList()

export default function HomeContent() {
  const navigate = useNavigate()
  const toSignIn = () => navigate('/welcome/sign-in')

  return (
    <div className="flex flex-col items-center">
      {/* Hero */}
      <section className="relative flex flex-col items-center pt-8 pb-0 w-full bg-white" style={{ minHeight: 620 }}>
        <div className="absolute bottom-0 left-1/2 -translate-x-[calc(50%+10px)] pointer-events-none">
          <HomeSvg />
        </div>
        <h1
          className="relative z-10 text-center text-[#1c1c26] font-semibold leading-none tracking-[-2px]"
          style={{ fontFamily: 'Poppins, sans-serif', fontSize: 'clamp(56px, 8vw, 96px)' }}
        >
          Pay smarter
          <br />
          not harder
        </h1>
        <p className="relative z-10 mt-5 text-[#606067] text-[15px] text-center leading-[24px]">
          Automated Web3 payments.<br />
          Non-custodial, transparent, effortless.
        </p>

        {/* Get Started button */}
        <div className="relative z-10 mt-[300px]">
          <button
            onClick={toSignIn}
            className="bg-[#5e85ee] text-white font-bold text-[16px] px-[22px] py-[17px] rounded-[14px] flex items-center gap-2 hover:bg-[#4a73e0] transition-colors shadow-lg"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            Get Started
            <img src={imgArrowRightLg} alt="" className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Feature cards */}
      <section className="bg-white w-full pt-16 pb-20 flex justify-center">
        <div className="flex flex-wrap gap-5 justify-center max-w-[1100px] w-full px-6">
          {/* Card 1 – Self-Custody */}
          <div className="bg-[rgba(94,133,238,0.04)] flex flex-col gap-5 items-center px-7 py-5 rounded-[24px] w-[calc(50%-12px)] min-w-[300px]">
            <div className="bg-white h-[220px] overflow-hidden relative rounded-[20px] w-full">
              <img src={box1svg} alt="" className="absolute inset-0 w-full h-full object-cover" />
            </div>
            <div className="flex flex-col gap-2 w-full">
              <p className="text-[#1c1c26] text-[21px] leading-[32px]" style={{ fontFamily: 'Poppins, sans-serif' }}>Self-Custody by Default</p>
              <p className="text-[#8d8d93] text-[13px] leading-[21px]">Funds remain fully controlled by the payer at all times, with no need for third-party custody. The payment logic is defined and locked by the payer's signature, while the smart contract is solely responsible for execution.</p>
            </div>
          </div>

          {/* Card 2 – Anonymous */}
          <div className="bg-[rgba(94,133,238,0.04)] flex flex-col gap-5 items-center px-7 py-5 rounded-[24px] w-[calc(50%-12px)] min-w-[300px]">
            <div className="bg-white h-[220px] overflow-hidden relative rounded-[20px] w-full">
              <img src={box2svg} alt="" className="absolute inset-0 w-full h-full object-cover" />
            </div>
            <div className="flex flex-col gap-2 w-full">
              <p className="text-[#1c1c26] text-[21px] leading-[32px]" style={{ fontFamily: 'Poppins, sans-serif' }}>Anonymous by Design</p>
              <p className="text-[#8d8d93] text-[13px] leading-[21px]">A single EOA is all you need to handle registration, payments, and receiving funds. Zero identity binding required—your real-world information remains completely inaccessible, even to us.</p>
            </div>
          </div>

          {/* Card 3 – Invisible Identity */}
          <div className="bg-[rgba(94,133,238,0.04)] flex flex-col gap-5 items-center px-7 py-5 rounded-[24px] w-[calc(50%-12px)] min-w-[300px]">
            <div className="bg-white h-[220px] overflow-hidden relative rounded-[20px] w-full">
              <img src={box3svg} alt="" className="absolute inset-0 w-full h-full object-cover" />
            </div>
            <div className="flex flex-col gap-2 w-full">
              <p className="text-[#1c1c26] text-[21px] leading-[32px]" style={{ fontFamily: 'Poppins, sans-serif' }}>Invisible Identity Layer</p>
              <p className="text-[#8d8d93] text-[13px] leading-[21px]">Identity is utilized solely for verification and is never exposed. Only an encrypted proxy identity resides on-chain, ensuring your real address remains completely untraceable.</p>
            </div>
          </div>

          {/* Card 4 – Dual-Address */}
          <div className="bg-[rgba(94,133,238,0.04)] flex flex-col gap-5 items-center px-7 py-5 rounded-[24px] w-[calc(50%-12px)] min-w-[300px]">
            <div className="bg-white h-[220px] overflow-hidden relative rounded-[20px] w-full">
              <img src={box4svg} alt="" className="absolute inset-0 w-full h-full object-cover" />
            </div>
            <div className="flex flex-col gap-2 w-full">
              <p className="text-[#1c1c26] text-[21px] leading-[32px]" style={{ fontFamily: 'Poppins, sans-serif' }}>Dual-Address Isolation</p>
              <p className="text-[#8d8d93] text-[13px] leading-[21px]">The proxy address and receiving address are strictly isolated, and both can be dynamically rotated. This ensures strict unlinkability for every flow of funds.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Advantages */}
      <section className="bg-white w-full flex justify-center py-20 relative overflow-hidden" style={{ minHeight: 600 }}>
        <div className="flex gap-12 max-w-[1100px] w-full px-6 items-center">
          {/* Left heading */}
          <div className="flex-1 flex flex-col justify-center shrink-0 min-w-[240px]">
            <p className="text-[#bbbbbe] leading-[58px] text-[46px] tracking-[-0.9px]" style={{ fontFamily: 'Poppins, sans-serif' }}>What are the</p>
            <p className="text-[#1c1c26] leading-none text-[72px] font-medium tracking-[-1.4px]" style={{ fontFamily: 'Poppins, sans-serif' }}>advantages</p>
            <p className="text-[#bbbbbe] leading-[58px] text-[46px] tracking-[-0.9px]" style={{ fontFamily: 'Poppins, sans-serif' }}>of pactpay?</p>
          </div>

          {/* Right — scrolling card list */}
          <div className="flex-1 overflow-hidden relative min-w-[300px]" style={{ height: 560 }}>
            {/* Top & bottom fade */}
            <div className="absolute inset-x-0 top-0 h-16 z-10 bg-gradient-to-b from-white to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-16 z-10 bg-gradient-to-t from-white to-transparent pointer-events-none" />

            {/* Scrolling list — duplicated for seamless loop */}
            <div style={{ animation: 'tickerScrollUp 22s linear infinite' }} className="flex flex-col gap-4">
              {[...tickerList, ...tickerList].map((entry, i) => {
                if (entry.type === 'badge-member') {
                  return (
                    <div key={i} className="bg-[rgba(94,133,238,0.12)] self-start px-3 py-1 rounded-full mt-2">
                      <span className="text-[#5e85ee] font-bold text-[14px]">For members</span>
                    </div>
                  )
                }
                if (entry.type === 'badge-org') {
                  return (
                    <div key={i} className="bg-[rgba(255,168,0,0.08)] self-start px-3 py-1 rounded-full mt-2">
                      <span className="text-[#ffa800] font-bold text-[14px]">For organisations</span>
                    </div>
                  )
                }
                return (
                  <div key={i} className="bg-[rgba(94,133,238,0.04)] flex items-center justify-between px-6 py-5 rounded-[22px]">
                    <p className="text-[#1c1c26] text-[19px] leading-[30px] flex-1 pr-4" style={{ fontFamily: 'Poppins, sans-serif' }}>{entry.text}</p>
                    <div className="bg-white p-2.5 rounded-full shrink-0">
                      <img src={entry.icon} alt="" className="w-[26px] h-[26px] object-contain" />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        {/* Left gradient overlay */}
        <div className="absolute inset-y-0 left-0 w-[40%] bg-gradient-to-r from-white to-transparent pointer-events-none" />
      </section>

      {/* Footer CTA */}
      <section className="bg-white w-full px-8 py-12 flex justify-center opacity-80">
        <div className="max-w-[1100px] w-full">
          <div className="flex items-center justify-between mb-6">
            <div className="flex flex-col gap-3">
              <img src={footicon1} alt="" className="w-[18px] h-[26px]" />
              <p className="text-[#1c1c26] text-[38px] font-medium tracking-[-0.8px] leading-[52px]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Pay smarter, not harder.
              </p>
            </div>
            <button
              onClick={toSignIn}
              className="bg-[#5e85ee] text-white font-bold text-[14px] px-6 py-3.5 rounded-[14px] hover:bg-[#4a73e0] transition-colors"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Lets Go!
            </button>
          </div>
          <div className="border-t border-[rgba(0,0,0,0.12)] pt-5">
            <p className="text-black text-[13px]">© All Rights Reserved by PayPact</p>
          </div>
        </div>
      </section>
    </div>
  )
}
