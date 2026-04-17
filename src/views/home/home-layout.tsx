import imgArrowRight from '@/assets/home/arrow-right.svg'
import imgGroupText from '@/assets/home/logo.svg'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'

export default function HomeLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  const toSignIn = () => navigate('/welcome/sign-in')

  const navLinks = [
    { label: 'Pricing', to: '/pricing' },
    { label: 'Document', to: '/document' },
  ]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'transparent' }}>
      {/* Header */}
      <div className="bg-transparent sticky top-0 z-50 flex justify-center pt-5 pb-3 px-6">
        <div className="bg-[#f0f0f0] flex items-center justify-between px-5 py-3 rounded-[20px] w-full max-w-[1100px]">
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
                className={`px-3 py-1.5 rounded-[40px] text-[15px] transition-colors ${location.pathname === to
                  ? 'text-[#1c1c26] font-medium bg-white/60'
                  : 'text-[#606067]'
                  }`}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Auth buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={toSignIn}
              className="bg-white border border-[rgba(0,0,0,0.12)] text-[#1c1c26] text-[13px] px-3.5 py-2 rounded-[11px] hover:bg-gray-50 transition-colors"
            >
              Log in
            </button>
            <button
              onClick={toSignIn}
              className="bg-[#5e85ee] text-white text-[13px] px-3.5 py-2 rounded-[11px] flex items-center gap-1.5 hover:bg-[#4a73e0] transition-colors"
            >
              Sign up
              <img src={imgArrowRight} alt="" className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Page content via Outlet */}
      <Outlet />
    </div>
  )
}
