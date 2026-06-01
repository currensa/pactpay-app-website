import * as React from 'react'
import { MOBILE_LAYOUT_BREAKPOINT, MOBILE_LAYOUT_MEDIA_QUERY } from '@/lib/responsive'

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(MOBILE_LAYOUT_MEDIA_QUERY)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_LAYOUT_BREAKPOINT)
    }
    mql.addEventListener('change', onChange)
    setIsMobile(window.innerWidth < MOBILE_LAYOUT_BREAKPOINT)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return !!isMobile
}
