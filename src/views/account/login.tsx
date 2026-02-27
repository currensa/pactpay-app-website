import api from '@/apis'
import { IconLoader2 } from '@tabler/icons-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CreateOrgStep1 from './components/create-org-step1'
import CreateOrgStep2 from './components/create-org-step2'
import IdentitySelection from './components/identity-selection'
import IntroSection from './components/intro-section'
import JoinOrganization from './components/join-organization'
import LoginForm from './components/login-form'
import SelectOrganization from './components/select-organization'
import WelcomeSection from './components/welcome-section'

type FlowStep =
  | 'welcome'
  | 'login'
  | 'identity'
  | 'selectOrg'
  | 'createOrgStep1'
  | 'createOrgStep2'
  | 'joinOrg'

export default function Login() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState<FlowStep>('welcome')
  const [checkingOrgs, setCheckingOrgs] = useState(false)

  const handleLoginSuccess = async () => {
    setCheckingOrgs(true)
    try {
      const list = await api.organization.getOrganizations()
      if (!list?.length) {
        setCurrentStep('identity')
        return
      }

      const adminOrgs = list.filter(item =>
        item.member.roles.some(
          r => r.role !== 'Employee' && r.role !== ('Member' as never)
        )
      )

      if (adminOrgs.length === 0) {
        navigate('/employee/overview', { replace: true })
      } else if (adminOrgs.length === 1) {
        localStorage.setItem('organizationId', adminOrgs[0].organization.orgId)
        navigate('/orgs/dashboard', { replace: true })
      } else {
        setCurrentStep('selectOrg')
      }
    } catch {
      setCurrentStep('identity')
    } finally {
      setCheckingOrgs(false)
    }
  }

  const handleIdentitySelect = (role: 'admin' | 'member') => {
    if (role === 'admin') {
      setCurrentStep('createOrgStep1')
    } else {
      setCurrentStep('joinOrg')
    }
  }

  const handleCreateOrgStep1Next = (_name: string) => {
    setCurrentStep('createOrgStep2')
  }

  const handleCreateOrgStep2Complete = () => {
    navigate('/orgs/dashboard')
  }

  const handleJoinOrg = (_code: string) => {
    setCurrentStep('selectOrg')
  }

  const handleCreateNewOrg = () => {
    setCurrentStep('createOrgStep1')
  }

  const renderRightSection = () => {
    switch (currentStep) {
      case 'welcome':
        return <WelcomeSection onGetStarted={() => setCurrentStep('login')} />
      case 'login':
        if (checkingOrgs) {
          return (
            <div className="flex h-full w-full flex-col items-center justify-center gap-4">
              <IconLoader2 className="h-8 w-8 animate-spin text-[#77777d]" />
              <p className="text-sm text-[#77777d]">Loading...</p>
            </div>
          )
        }
        return <LoginForm onLoginSuccess={handleLoginSuccess} />
      case 'identity':
        return <IdentitySelection onSelect={handleIdentitySelect} />
      case 'selectOrg':
        return <SelectOrganization onCreateNew={handleCreateNewOrg} />
      case 'createOrgStep1':
        return (
          <CreateOrgStep1
            onBack={() => setCurrentStep('identity')}
            onNext={handleCreateOrgStep1Next}
          />
        )
      case 'createOrgStep2':
        return (
          <CreateOrgStep2
            onBack={() => setCurrentStep('createOrgStep1')}
            onComplete={handleCreateOrgStep2Complete}
          />
        )

      case 'joinOrg':
        return (
          <JoinOrganization onBack={() => setCurrentStep('identity')} onJoin={handleJoinOrg} />
        )
      default:
        return <WelcomeSection onGetStarted={() => setCurrentStep('login')} />
    }
  }

  return (
    <div className="flex h-dvh w-full flex-col items-center gap-4 overflow-hidden bg-white p-4 lg:flex-row lg:gap-[60px] lg:px-[80px] lg:py-[80px]">
      <IntroSection />
      <div className="flex w-full lg:h-full">{renderRightSection()}</div>
    </div>
  )
}
