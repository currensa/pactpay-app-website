import api from '@/apis'
import useAuthStore from '@/stores/auth'
import useOrganizationStore from '@/stores/organization'
import { IconLoader2 } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import BindWallet from './components/bind-wallet'
import CreateOrgStep1 from './components/create-org-step1'
import IdentitySelection from './components/identity-selection'
import IntroSection from './components/intro-section'
import JoinOrganization from './components/join-organization'
import LoginForm from './components/login-form'
import SelectOrganization from './components/select-organization'
import WelcomeSection from './components/welcome-section'

type FlowStep =
  | 'welcome'
  | 'login'
  | 'checking'
  | 'identity'
  | 'selectOrg'
  | 'createOrgStep1'
  | 'joinOrg'
  | 'bindWallet'

/** Admin roles: Owner / Admin / Operator */
function hasAdminRole(roles: { role: string }[]) {
  return roles.some(r => r.role !== 'Employee' && r.role !== 'Member')
}

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const getOrganizations = useOrganizationStore(s => s.getOrganizations)
  const setCurrentOrg = useOrganizationStore(s => s.setCurrentOrg)
  const checkMetaPub = useAuthStore(s => s.checkMetaPub)

  // Support redirects from layout guards: navigate('/account/login', { state: { step: 'bindWallet' } })
  const initialStep: FlowStep = (location.state as any)?.step ?? 'welcome'
  const [currentStep, setCurrentStep] = useState<FlowStep>(initialStep)

  // Clear location state so a refresh doesn't re-trigger the step
  useEffect(() => {
    if (location.state?.step) {
      window.history.replaceState({}, '')
    }
  }, [])

  /** After login: fetch orgs and decide where to send the user */
  const handleLoginSuccess = async () => {
    setCurrentStep('checking')
    try {
      const orgs = await getOrganizations()

      if (!orgs?.length) {
        setCurrentStep('identity')
        return
      }

      const adminOrgs = orgs.filter(item => hasAdminRole(item.member.roles))

      if (adminOrgs.length === 0) {
        // Only employee-role orgs → go to C端 (with metaPub gate)
        await enterEmployeeSide()
      } else {
        // Has at least one admin org → show selection
        setCurrentStep('selectOrg')
      }
    } catch {
      setCurrentStep('identity')
    }
  }

  /** Enter employee (C端) side: check metaPub first */
  const enterEmployeeSide = async () => {
    const submitted = await checkMetaPub()
    if (!submitted) {
      setCurrentStep('bindWallet')
    } else {
      navigate('/employee/overview', { replace: true })
    }
  }

  // --- Step handlers ---

  const handleIdentitySelect = (role: 'admin' | 'member') => {
    if (role === 'admin') {
      setCurrentStep('createOrgStep1')
    } else {
      setCurrentStep('joinOrg')
    }
  }

  const handleCreateOrgSuccess = () => {
    navigate('/orgs/dashboard', { replace: true })
  }

  const handleJoinOrgSuccess = async () => {
    // Re-fetch orgs so the store is up-to-date
    await getOrganizations()
    await enterEmployeeSide()
  }

  const handleEnterAsEmployee = async () => {
    setCurrentStep('checking')
    await enterEmployeeSide()
  }

  const handleSelectAdminOrg = (orgId: string, member: import('@/apis/orgnization.api').OrganizationMember) => {
    setCurrentOrg(orgId, member)
    navigate('/orgs/dashboard', { replace: true })
  }

  const handleBindWalletSuccess = () => {
    navigate('/employee/overview', { replace: true })
  }

  // --- Render ---

  const renderRightSection = () => {
    switch (currentStep) {
      case 'welcome':
        return <WelcomeSection onGetStarted={() => setCurrentStep('login')} />

      case 'login':
        return <LoginForm onLoginSuccess={handleLoginSuccess} />

      case 'checking':
        return (
          <div className="flex h-full w-full flex-col items-center justify-center gap-4">
            <IconLoader2 className="h-8 w-8 animate-spin text-[#77777d]" />
            <p className="text-sm text-[#77777d]">Loading...</p>
          </div>
        )

      case 'identity':
        return <IdentitySelection onSelect={handleIdentitySelect} />

      case 'selectOrg':
        return (
          <SelectOrganization
            onCreateNew={() => setCurrentStep('createOrgStep1')}
            onEnterAsEmployee={handleEnterAsEmployee}
            onSelectAdminOrg={handleSelectAdminOrg}
          />
        )

      case 'createOrgStep1':
        return (
          <CreateOrgStep1
            onBack={() => setCurrentStep('identity')}
            onNext={handleCreateOrgSuccess}
          />
        )

      case 'joinOrg':
        return (
          <JoinOrganization
            onBack={() => setCurrentStep('identity')}
            onJoin={handleJoinOrgSuccess}
          />
        )

      case 'bindWallet':
        return <BindWallet onSuccess={handleBindWalletSuccess} />

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
