import imgArrowRight from '@/assets/home/arrow-right.svg'
import PublicLanguageSwitcher from '@/components/app/base/public-language-switcher'
import { usePublicCopy } from '@/views/public/copy'
import imgGroupText from '@/assets/home/logo.svg'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'

export default function HomeLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { copy } = usePublicCopy()

  const toSignIn = () => navigate('/welcome/sign-in')

  const navLinks = [
    { label: copy.homeLayout.pricing, to: '/pricing' },
    { label: copy.homeLayout.document, to: '/document' },
  ]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'transparent' }}>
      {/* Header */}
      <div className="sticky top-0 z-50 flex justify-center pt-5 pb-3 px-6">
        <div className="relative w-full max-w-[1100px]">

          {/* 流动渐变光效 */}
          <div className="pointer-events-none absolute inset-0 rounded-[22px] before:absolute before:inset-0 before:rounded-[22px] before:bg-[linear-gradient(120deg,rgba(255,255,255,0.25),rgba(255,255,255,0.05),rgba(255,255,255,0.25))] before:opacity-40 before:animate-[shine_6s_linear_infinite]" />

          {/* 毛玻璃主体 */}
          <div className="relative flex items-center justify-between px-5 py-3 rounded-[20px]
      bg-white/10 backdrop-blur-xl
      border border-white/20
      shadow-[0_8px_32px_rgba(0,0,0,0.08)]">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-1">
              <div className="w-[96px] h-[34px] overflow-hidden relative">
                <img src={imgGroupText} alt="PactPay" className="absolute inset-0 w-full h-full object-contain" />
              </div>
            </Link>

            {/* Nav */}
            <div className="flex items-center gap-5">
              {navLinks.map(({ label, to }) => (
                <Link
                  key={to}
                  to={to}
                  className={`px-3 py-1.5 rounded-[40px] text-[15px] transition-all
              ${location.pathname === to
                      ? 'text-[#1c1c26] font-medium bg-white/40 backdrop-blur-md shadow-sm'
                      : 'text-[#606067] hover:text-[#1c1c26] hover:bg-white/20'
                    }`}
                >
                  {label}
                </Link>
              ))}
            </div>

            {/* Auth buttons */}
            <div className="flex items-center gap-2.5">
              <PublicLanguageSwitcher />
              <button
                onClick={toSignIn}
                className="bg-white/40 backdrop-blur-md border border-white/30
          text-[#1c1c26] text-[13px] px-3.5 py-2 rounded-[11px]
          hover:bg-white/60 transition-all"
              >
                {copy.homeLayout.logIn}
              </button>

              <button
                onClick={toSignIn}
                className="bg-gradient-to-r from-[#5e85ee] to-[#7aa2ff]
          text-white text-[13px] px-3.5 py-2 rounded-[11px]
          flex items-center gap-1.5
          shadow-md hover:shadow-lg hover:scale-[1.03]
          transition-all"
              >
                {copy.homeLayout.signUp}
                <img src={imgArrowRight} alt="" className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Page content via Outlet */}
      <Outlet />
    </div>
  )
}
