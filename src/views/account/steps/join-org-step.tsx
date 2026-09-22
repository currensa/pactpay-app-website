import useAuthStore from '@/stores/auth'
import useOrganizationStore from '@/stores/organization'
import { useNavigate } from 'react-router-dom'
import JoinOrganization from '../components/join-organization'
import { INVITE_CODE_SESSION_KEY } from '../join-invite'

export default function JoinOrgStep() {
  const navigate = useNavigate()
  const getOrganizations = useOrganizationStore(s => s.getOrganizations)
  const checkPrivacyProfile = useAuthStore(s => s.checkPrivacyProfile)

  const handleJoin = async () => {
    await getOrganizations()
    const submitted = await checkPrivacyProfile()
    if (!submitted) {
      navigate('/welcome/bind-wallet', { replace: true })
    } else {
      navigate('/member/dashboard', { replace: true })
    }
  }

  return (
    <JoinOrganization
      initialCode={sessionStorage.getItem(INVITE_CODE_SESSION_KEY) ?? undefined}
      onBack={() => navigate(-1)}
      onJoin={handleJoin}
    />
  )
}
