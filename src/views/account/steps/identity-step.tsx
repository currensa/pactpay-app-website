import { useNavigate } from 'react-router-dom'
import IdentitySelection from '../components/identity-selection'

export default function IdentityStep() {
  const navigate = useNavigate()

  const handleSelect = (role: 'admin' | 'member') => {
    if (role === 'admin') navigate('/welcome/create-org')
    else navigate('/welcome/join-org')
  }

  return <IdentitySelection onSelect={handleSelect} />
}
