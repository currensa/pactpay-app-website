import useAuthStore from '@/stores/auth'
import { IconLoader2 } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Guards member (C端) routes.
 * Access is granted if EITHER the user has gravArcUserInfo OR has submitted
 * metaPub (二选一). If neither is satisfied, redirects to the bind-wallet step.
 */
export default function MemberGuard({ children }: { children: React.ReactNode }) {
  const { checkMetaPub, metaPubSubmitted, gravArcUserInfo } = useAuthStore()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // gravArcUserInfo satisfies the gate on its own — no API call needed
    if (gravArcUserInfo !== null) {
      setChecking(false)
      return
    }

    // Skip API call if we already know the status
    if (metaPubSubmitted !== null) {
      if (!metaPubSubmitted) {
        navigate('/welcome/bind-wallet', { replace: true })
      } else {
        setChecking(false)
      }
      return
    }

    checkMetaPub()
      .then(submitted => {
        if (!submitted) {
          navigate('/welcome/bind-wallet', { replace: true })
        } else {
          setChecking(false)
        }
      })
      .catch(() => {
        navigate('/welcome', { replace: true })
      })
  }, [])

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center">
        <IconLoader2 className="h-8 w-8 animate-spin text-[#77777d]" />
      </div>
    )
  }

  return <>{children}</>
}
