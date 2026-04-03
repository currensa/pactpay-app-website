import { useNavigate } from 'react-router-dom'
import WelcomeSection from '../components/welcome-section'

export default function WelcomeStep() {
  const navigate = useNavigate()
  return <WelcomeSection onGetStarted={() => navigate('/welcome/sign-in')} />
}
