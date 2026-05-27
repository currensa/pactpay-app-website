import { Outlet, useLocation } from 'react-router-dom'
import PublicLanguageSwitcher from '@/components/app/base/public-language-switcher'
import IntroSection from './components/intro-section'

export default function LoginLayout() {
  const location = useLocation()
  const isWelcome = location.pathname === '/welcome' || location.pathname === '/welcome/'

  return (
    <div className="flex h-dvh w-full flex-col items-center gap-4 overflow-hidden bg-white px-4 py-[40px] lg:flex-row lg:gap-[60px] lg:px-[80px] lg:py-[80px]">
      <div className="absolute right-4 top-4 z-20 lg:right-8 lg:top-8">
        <PublicLanguageSwitcher />
      </div>
      {isWelcome && <IntroSection />}
      <div className="flex h-full w-full flex-1">
        <Outlet />
      </div>
    </div>
  )
}
