import { useNavigate } from 'react-router-dom'
import BindWallet from '../components/bind-wallet'

export default function BindWalletStep() {
  const navigate = useNavigate()
  return <BindWallet onSuccess={() => navigate('/member/dashboard', { replace: true })} />
}
