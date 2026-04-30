import { useNavigate } from 'react-router-dom'
import CreateOrgStep1 from '../components/create-org-step1'

export default function CreateOrgStep() {
  const navigate = useNavigate()
  return (
    <CreateOrgStep1
      onBack={() => navigate(-1)}
      onNext={(_, options) => {
        if (options?.redirectToBindWallet) {
          navigate('/welcome/bind-wallet', {
            replace: true,
            state: { redirectTo: '/orgs/dashboard' },
          })
          return
        }

        navigate('/orgs/dashboard', { replace: true })
      }}
    />
  )
}
