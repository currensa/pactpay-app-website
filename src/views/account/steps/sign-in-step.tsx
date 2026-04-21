import apis from '@/apis'
import { useToast } from '@/components/ui/use-toast'
import useAuthStore from '@/stores/auth'
import useOrganizationStore from '@/stores/organization'
import { IconLoader2 } from '@tabler/icons-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LoginForm from '../components/login-form'
import { INVITE_CODE_SESSION_KEY } from '../join-invite'

function hasAdminRole(roles: { role: string }[]) {
  return roles.some(r => r.role !== 'Member')
}

export default function SignInStep() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(false)
  const { toast } = useToast()
  const getOrganizations = useOrganizationStore(s => s.getOrganizations)
  const checkMetaPub = useAuthStore(s => s.checkMetaPub)

  const handleLoginSuccess = async () => {
    setChecking(true)

    const pendingCode = sessionStorage.getItem(INVITE_CODE_SESSION_KEY)
    if (pendingCode) {
      try {
        const { isMember } = await apis.organization.checkInviteCodeMembership(pendingCode)
        if (isMember) {
          sessionStorage.removeItem(INVITE_CODE_SESSION_KEY)
          toast({ title: 'Already a member', description: 'You have already joined this organization.' })
          // fall through to normal org routing below
        } else {
          navigate('/welcome/join-org', { replace: true })
          return
        }
      } catch {
        navigate('/welcome/join-org', { replace: true })
        return
      }
    }

    try {
      const orgs = await getOrganizations()

      if (!orgs?.length) {
        navigate('/welcome/identity', { replace: true })
        return
      }

      const adminOrgs = orgs.filter(item => hasAdminRole(item.member.roles))

      if (adminOrgs.length === 0) {
        const submitted = await checkMetaPub()
        if (!submitted) {
          navigate('/welcome/bind-wallet', { replace: true })
        } else {
          navigate('/member/dashboard', { replace: true })
        }
      } else {
        navigate('/welcome/select-org', { replace: true })
      }
    } catch {
      navigate('/welcome/identity', { replace: true })
    } finally {
      setChecking(false)
    }
  }

  if (checking) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4">
        <IconLoader2 className="h-8 w-8 animate-spin text-[#77777d]" />
        <p className="text-sm text-[#77777d]">Loading...</p>
      </div>
    )
  }

  return <LoginForm onLoginSuccess={handleLoginSuccess} />
}
