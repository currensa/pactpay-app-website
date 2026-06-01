import { Outlet, useLocation } from 'react-router-dom'
import PublicLanguageSwitcher from '@/components/app/base/public-language-switcher'
import IntroSection from './components/intro-section'

export default function LoginLayout() {
  const location = useLocation()
  const isWelcome = location.pathname === '/welcome' || location.pathname === '/welcome/'

  return (
    <div className="relative flex min-h-dvh w-full flex-col items-center gap-4 overflow-x-hidden overflow-y-auto bg-white px-4 pb-8 pt-16 lg:h-dvh lg:flex-row lg:gap-[60px] lg:overflow-hidden lg:px-[80px] lg:py-[80px]">
      <div className="absolute right-4 top-4 z-20 lg:right-8 lg:top-8">
        <PublicLanguageSwitcher />
      </div>
      {isWelcome && <IntroSection />}
      <div className="flex w-full flex-1 lg:h-full">
        <Outlet />
      </div>
    </div>
  )
}
