import imgArrowRightLg from '@/assets/home/arrow-right.svg'
import footicon1 from '@/assets/home/footicon1.svg'
import HomeSvg from '@/assets/home/HomeSvg'
import box1svg from '@/assets/home/home1box1.svg'
import box2svg from '@/assets/home/home2box1.svg'
import box3svg from '@/assets/home/home3box1.svg'
import box4svg from '@/assets/home/home4box1.svg'
import sicon2 from '@/assets/home/homessicon2.svg'
import sicon4 from '@/assets/home/homessicon4.svg'
import sicon5 from '@/assets/home/homessicon5.svg'
import sicon6 from '@/assets/home/homessicon6.svg'
import { usePublicCopy } from '@/views/public/copy'
import { useNavigate } from 'react-router-dom'

export default function HomeContent() {
  const navigate = useNavigate()
  const { copy } = usePublicCopy()
  const toSignIn = () => navigate('/welcome/sign-in')
  const featureItems = [
    { ...copy.homeContent.features[0], icon: sicon4, image: box1svg },
    { ...copy.homeContent.features[1], icon: sicon5, image: box2svg },
    { ...copy.homeContent.features[2], icon: sicon2, image: box3svg },
    { ...copy.homeContent.features[3], icon: sicon6, image: box4svg },
  ]

  return (
    <div className="flex flex-col items-center">
      <section className="relative flex min-h-[620px] w-full flex-col items-center bg-white pb-0 pt-8">
        <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-[calc(50%+10px)]">
          <HomeSvg />
        </div>
        <h1
          className="relative z-10 text-center font-semibold leading-none tracking-[-2px] text-[#404042]"
          style={{ fontFamily: 'Poppins, sans-serif', fontSize: 'clamp(36px, 8vw, 40px)', lineHeight: '1.5' }}
        >
          {copy.homeContent.heroTitle[0]}
          <br />
          {copy.homeContent.heroTitle[1]}
        </h1>

        <div className="relative z-10 mt-[350px]">
          <button
            onClick={toSignIn}
            className="flex items-center gap-2 rounded-[14px] bg-[#5e85ee] px-[22px] py-[17px] text-[16px] font-bold text-white shadow-lg transition-colors hover:bg-[#4a73e0]"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            {copy.common.getStarted}
            <img src={imgArrowRightLg} alt="" className="h-5 w-5" />
          </button>
        </div>
      </section>

      <section className="flex w-full justify-center bg-white pb-20 pt-16">
        <div className="flex w-full max-w-[1100px] flex-wrap justify-center gap-5 px-6">
          {featureItems.map(item => (
            <div
              key={item.title}
              className="flex min-w-[300px] w-[calc(50%-12px)] flex-col items-center gap-5 rounded-[24px] bg-[rgba(94,133,238,0.04)] px-7 py-5"
            >
              <div className="relative h-[220px] w-full overflow-hidden rounded-[20px] bg-white">
                <img src={item.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
              </div>
              <div className="flex w-full flex-col gap-2">
                <p className="text-[21px] leading-[32px] text-[#1c1c26]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {item.title}
                </p>
                <p className="text-[13px] leading-[21px] text-[#8d8d93]">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="relative flex min-h-[600px] w-full justify-center overflow-hidden bg-white py-20">
        <div className="flex w-full max-w-[1100px] items-center gap-12 px-6">
          <div className="flex min-w-[240px] shrink-0 flex-1 flex-col justify-center">
            <p className="text-[46px] leading-[58px] tracking-[-0.9px] text-[#bbbbbe]" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {copy.homeContent.advantagesTitle[0]}
            </p>
            <p className="text-[72px] leading-none tracking-[-1.4px] text-[#1c1c26]" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500 }}>
              {copy.homeContent.advantagesTitle[1]}
            </p>
            <p className="text-[46px] leading-[58px] tracking-[-0.9px] text-[#bbbbbe]" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {copy.homeContent.advantagesTitle[2]}
            </p>
          </div>

          <div className="relative min-w-[300px] flex-1 overflow-hidden" style={{ height: 560 }}>
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-white to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-gradient-to-t from-white to-transparent" />

            <div style={{ animation: 'tickerScrollUp 22s linear infinite' }} className="flex flex-col gap-4">
              {[...featureItems, ...featureItems].map((entry, i) => (
                <div key={`${entry.title}-${i}`} className="flex items-center justify-between rounded-[22px] bg-[rgba(94,133,238,0.04)] px-6 py-5">
                  <div className="flex-1 pr-4">
                    <p className="text-[19px] leading-[30px] text-[#1c1c26]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      {entry.title}
                    </p>
                    <p className="mt-1 text-[13px] leading-[21px] text-[#8d8d93]">{entry.description}</p>
                  </div>
                  <div className="shrink-0 rounded-full bg-white p-2.5">
                    <img src={entry.icon} alt="" className="h-[26px] w-[26px] object-contain" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-[40%] bg-gradient-to-r from-white to-transparent" />
      </section>

      <section className="flex w-full justify-center bg-white px-8 py-12 opacity-80">
        <div className="w-full max-w-[1100px]">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex flex-col gap-3">
              <img src={footicon1} alt="" className="h-[26px] w-[18px]" />
              <p className="text-[38px] font-medium leading-[52px] tracking-[-0.8px] text-[#1c1c26]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                {copy.homeContent.footerTitle}
              </p>
            </div>
            <button
              onClick={toSignIn}
              className="rounded-[14px] bg-[#5e85ee] px-6 py-3.5 text-[14px] font-bold text-white transition-colors hover:bg-[#4a73e0]"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {copy.homeContent.footerCta}
            </button>
          </div>
          <div className="flex items-center justify-between border-t border-[rgba(0,0,0,0.12)] pt-5">
            <p className="text-[13px] text-black">{copy.homeContent.copyright}</p>
            <div className="flex items-center gap-1 text-[13px] text-[#606067]">
              <a href="/legal/terms" className="transition-colors hover:text-[#1c1c26]">{copy.common.termsOfUse}</a>
              <span className="opacity-40">|</span>
              <a href="/legal/privacy" className="transition-colors hover:text-[#1c1c26]">{copy.common.privacyPolicy}</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
