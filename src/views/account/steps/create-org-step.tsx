import { useNavigate } from 'react-router-dom'
import CreateOrgStep1 from '../components/create-org-step1'

export default function CreateOrgStep() {
  const navigate = useNavigate()
  return (
    <CreateOrgStep1
      onBack={() => navigate(-1)}
      onNext={() => navigate('/orgs/dashboard', { replace: true })}
    />
  )
}
