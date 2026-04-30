import { useLocation, useNavigate } from 'react-router-dom'
import BindWallet from '../components/bind-wallet'

export default function BindWalletStep() {
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = (location.state as { redirectTo?: string } | null)?.redirectTo ?? '/member/dashboard'

  return <BindWallet onSuccess={() => navigate(redirectTo, { replace: true })} />
}
