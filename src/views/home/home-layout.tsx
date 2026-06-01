import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useIsMobile } from '@/hooks/use-mobile'
import imgArrowRight from '@/assets/home/arrow-right.svg'
import PublicLanguageSwitcher from '@/components/app/base/public-language-switcher'
import { usePublicCopy } from '@/views/public/copy'
import imgGroupText from '@/assets/home/logo.svg'
import { Menu } from 'lucide-react'
import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'

export default function HomeLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { copy } = usePublicCopy()
  const isMobile = useIsMobile()
  const [menuOpen, setMenuOpen] = useState(false)

  const toSignIn = () => navigate('/welcome/sign-in')

  const navLinks = [
    { label: copy.homeLayout.pricing, to: '/pricing' },
    { label: copy.homeLayout.document, to: '/document' },
  ]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'transparent' }}>
      {/* Header */}
      <div className="sticky top-0 z-50 flex justify-center px-4 pb-3 pt-4 md:px-6 md:pt-5">
        <div className="relative w-full max-w-[1100px]">

          {/* 流动渐变光效 */}
          <div className="pointer-events-none absolute inset-0 rounded-[22px] before:absolute before:inset-0 before:rounded-[22px] before:bg-[linear-gradient(120deg,rgba(255,255,255,0.25),rgba(255,255,255,0.05),rgba(255,255,255,0.25))] before:opacity-40 before:animate-[shine_6s_linear_infinite]" />

          {/* 毛玻璃主体 */}
          <div className="relative flex items-center justify-between rounded-[18px] px-4 py-3 md:rounded-[20px] md:px-5
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
            {isMobile ? (
              <div className="flex items-center gap-2">
                <PublicLanguageSwitcher />
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="border-white/30 bg-white/30 backdrop-blur-md"
                  onClick={() => setMenuOpen(true)}
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="right" className="w-[86vw] max-w-[320px] border-l border-[rgba(0,0,0,0.08)] bg-[#f8fafc] p-0">
          <div className="flex h-full flex-col px-5 py-6">
            <SheetTitle className="text-left text-[18px] text-[#1c1c26]">PactPay</SheetTitle>
            <div className="mt-6 flex flex-col gap-2">
              {navLinks.map(({ label, to }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMenuOpen(false)}
                  className={`rounded-[14px] px-4 py-3 text-[15px] transition-colors ${
                    location.pathname === to
                      ? 'bg-[rgba(94,133,238,0.1)] font-medium text-[#5e85ee]'
                      : 'bg-white text-[#1c1c26]'
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>
            <div className="mt-auto flex flex-col gap-3 pt-6">
              <Button variant="outline" className="w-full" onClick={toSignIn}>
                {copy.homeLayout.logIn}
              </Button>
              <Button className="w-full" onClick={toSignIn}>
                {copy.homeLayout.signUp}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Page content via Outlet */}
      <Outlet />
    </div>
  )
}
