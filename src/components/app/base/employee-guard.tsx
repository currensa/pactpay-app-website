import useAuthStore from '@/stores/auth'
import { IconLoader2 } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Guards employee (C端) routes.
 * Ensures the user has submitted metaPub before accessing employee pages.
 * If not submitted, redirects back to login to show the bind-wallet step.
 */
export default function EmployeeGuard({ children }: { children: React.ReactNode }) {
  const { checkMetaPub, metaPubSubmitted } = useAuthStore()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Skip API call if we already know the status
    if (metaPubSubmitted !== null) {
      if (!metaPubSubmitted) {
        navigate('/account/login', { replace: true, state: { step: 'bindWallet' } })
      } else {
        setChecking(false)
      }
      return
    }

    checkMetaPub()
      .then(submitted => {
        if (!submitted) {
          navigate('/account/login', { replace: true, state: { step: 'bindWallet' } })
        } else {
          setChecking(false)
        }
      })
      .catch(() => {
        navigate('/account/login', { replace: true })
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
