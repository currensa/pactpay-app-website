import { Outlet, useLocation } from 'react-router-dom'
import IntroSection from './components/intro-section'

export default function LoginLayout() {
  const location = useLocation()
  const isWelcome = location.pathname === '/welcome' || location.pathname === '/welcome/'

  return (
    <div className="flex h-dvh w-full flex-col items-center gap-4 overflow-hidden bg-white px-4 py-[40px] lg:flex-row lg:gap-[60px] lg:px-[80px] lg:py-[80px]">
      {isWelcome && <IntroSection />}
      <div className="flex h-full w-full flex-1">
        <Outlet />
      </div>
    </div>
  )
}
