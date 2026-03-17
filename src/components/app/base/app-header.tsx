import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { getRouteMeta } from '@/router'
import { IconBadgeCc, IconBell, IconLogout } from '@tabler/icons-react'
import { useDisconnect } from '@reown/appkit/react'
import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

export default function AppHeader() {
  const location = useLocation()
  const navigate = useNavigate()
  const { disconnect } = useDisconnect()

  const meta = useMemo(() => getRouteMeta(location.pathname) ?? {}, [location.pathname])

  async function handleLogout() {
    await disconnect()
    localStorage.removeItem('token')
    navigate('/account/login')
    window.location.reload()
  }

  return (
    <div className="flex shrink-0 items-center justify-between">
      {/* Page title + subtitle */}
      <div className="flex flex-col">
        <p className="font-['Poppins',sans-serif] text-[28px] leading-[40px] text-[#1c1c26]">
          {meta.title}
        </p>
        {meta.subtitle && (
          <p className="font-['Inter',sans-serif] text-[14px] leading-[22px] text-[#a4a4a8]">
            {meta.subtitle}
          </p>
        )}
      </div>

      {/* Right: bell + user avatar */}
      <div className="flex items-center gap-[8px]">
        <button className="flex h-[48px] w-[48px] items-center justify-center rounded-full bg-white transition-colors hover:bg-[#f5f5f5]">
          <IconBell className="h-[22px] w-[22px] text-[#1c1c26]" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-full outline-none ring-2 ring-white">
              <Avatar className="h-[48px] w-[48px] cursor-pointer rounded-full">
                <AvatarImage src="https://github.com/shadcn.png" alt="User" />
                <AvatarFallback className="rounded-full bg-[#5e85ee] text-white">U</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-48 rounded-[16px]" align="end" sideOffset={8}>
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-3 py-2">
                <Avatar className="h-8 w-8 rounded-full">
                  <AvatarImage src="https://github.com/shadcn.png" alt="User" />
                  <AvatarFallback className="rounded-full bg-[#5e85ee] text-white text-xs">U</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[#1c1c26]">Account</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() => navigate('/account/settings/account', { state: { from: location.pathname } })}
                className="cursor-pointer"
              >
                <IconBadgeCc className="mr-2 h-4 w-4" />
                Account Settings
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-500 focus:text-red-500">
              <IconLogout className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
