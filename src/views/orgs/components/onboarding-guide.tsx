import apis from '@/apis'
import { Check, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface StepDef {
  id: number
  label: string
  buttonText: string
  description: string
  navigateTo: string | null
  isExternal?: boolean
}

const STEPS: StepDef[] = [
  {
    id: 1,
    label: 'Learn how payments work',
    buttonText: 'View Docs',
    description: 'Understand how PactPay sends payroll on-chain — non-custodial, transparent, and direct to your members.',
    navigateTo: 'https://docs.pactpay.app',
    isExternal: true,
  },
  {
    id: 2,
    label: 'Configure payment settings',
    buttonText: 'Go to Settings',
    description: 'Choose your chain and stablecoin (e.g. USDC on Ethereum mainnet).',
    navigateTo: '/orgs/settings',
  },
  {
    id: 3,
    label: 'Invite your first member',
    buttonText: 'Invite Members',
    description: 'Add your team members so you can start scheduling payments for them.',
    navigateTo: '/orgs/members',
  },
  {
    id: 4,
    label: 'Set member payout amounts',
    buttonText: 'Set Amounts',
    description: 'Configure the amount each member should receive each pay period.',
    navigateTo: '/orgs/members',
  },
  {
    id: 5,
    label: 'Create first transaction',
    buttonText: 'Create Transaction',
    description: 'Execute your first on-chain transaction to pay your members.',
    navigateTo: '/orgs/transaction/create',
  },
]

export function OnboardingGuide() {
  const navigate = useNavigate()
  const orgId = localStorage.getItem('organizationId') ?? undefined

  const [dismissed, setDismissed] = useState<boolean | null>(null) // null = loading
  const [completedSteps, setCompletedSteps] = useState<boolean[]>([false, false, false, false, false])
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    loadGuide()
  }, [])

  useEffect(() => {
    const handler = () => {
      apis.onboarding.patchGuide({ dismissed: false, orgId }).catch(() => {})
      setDismissed(false)
      checkSteps()
    }
    window.addEventListener('pactpay:show-onboarding', handler)
    return () => window.removeEventListener('pactpay:show-onboarding', handler)
  }, [])

  const loadGuide = async () => {
    try {
      const record = await apis.onboarding.getGuide(orgId)
      setDismissed(record.dismissed)
      if (!record.dismissed) checkSteps()
    } catch {
      setDismissed(false)
      checkSteps()
    }
  }

  const checkSteps = async () => {
    try {
      // Step 1: View docs — treated as always complete (no trackable signal)
      const step1Done = true

      const payrollConfig = await apis.organization.getOrgPayrollConfig().catch(() => null)
      const step2Done = Boolean(payrollConfig)

      const membersRes = await apis.organization.getOrganizationMembers({ page: 1, pageSize: 1 }).catch(() => null)
      const step3Done = (membersRes?.total ?? 0) > 1

      const allMembers = await apis.organization.getOrganizationMembers({ page: 1, pageSize: 50 }).catch(() => null)
      const step4Done = (allMembers?.data ?? []).some(
        m => m.payoutIntent?.amount && m.payoutIntent.amount !== '0'
      )

      const dashStats = await apis.statistics.getDashboardStatistics().catch(() => null)
      const step5Done = (dashStats?.totalPaid?.length ?? 0) > 0

      if (step5Done) {
        STEPS[4].description = "🎉Congratulations! You've completed your first transaction!"
      }

      const newCompleted = [step1Done, step2Done, step3Done, step4Done, step5Done]
      setCompletedSteps(newCompleted)

      const firstIncomplete = newCompleted.indexOf(false)
      setActiveStep(firstIncomplete >= 0 ? firstIncomplete : newCompleted.length - 1)
    } catch {
      // silently ignore
    }
  }

  const handleDismiss = async () => {
    setDismissed(true)
    window.dispatchEvent(new CustomEvent('pactpay:onboarding-dismissed'))
    await apis.onboarding.patchGuide({ dismissed: true, orgId }).catch(() => {})
  }

  const handleStepClick = (idx: number) => {
    const allPrevDone = idx === 0 || completedSteps.slice(0, idx).every(Boolean)
    if (allPrevDone) setActiveStep(idx)
  }

  const handleAction = () => {
    const step = STEPS[activeStep]
    if (step.isExternal && step.navigateTo) {
      window.open(step.navigateTo, '_blank', 'noopener,noreferrer')
    } else if (step.navigateTo) {
      navigate(step.navigateTo)
    }
  }

  if (dismissed === null || dismissed) return null

  const activeStepDef = STEPS[activeStep]

  return (
    <div className="flex gap-[20px] items-start bg-white border border-[rgba(94,133,238,0.10)] rounded-[28px] pl-[28px] pr-[20px] py-[20px] overflow-hidden">
      {/* Left: title + dismiss */}
      <div className="flex flex-col items-start justify-between py-[8px] self-stretch shrink-0 w-[160px]">
        <div className="flex flex-col gap-[8px]">
          <div>
            <p className="font-['Poppins',sans-serif] text-[18px] leading-[26px] text-[#bbbbbe] tracking-[-0.36px]">Get started with</p>
            <p className="font-['Poppins',sans-serif] font-semibold text-[32px] leading-none text-[#1c1c26] tracking-[-0.64px]">PactPay</p>
          </div>
          <p className="text-[12px] leading-[18px] text-[#8d8d93]">
            Complete these steps to learn how PactPay works with you.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="border border-[rgba(0,0,0,0.12)] rounded-[10px] px-[14px] py-[8px] text-[13px] leading-[20px] text-[#1c1c26] hover:bg-[#f5f5f5] transition-colors"
        >
          Dismiss
        </button>
      </div>

      {/* Right: steps + detail */}
      <div className="flex-1 min-w-0 flex flex-col gap-[12px] bg-[rgba(94,133,238,0.04)] rounded-[18px] px-[20px] py-[16px]">
        {/* Step tabs */}
        <div className="flex gap-[10px] items-start">
          {STEPS.map((step, idx) => {
            const isCompleted = completedSteps[idx]
            const isActive = idx === activeStep
            const isCurrentTask = !isCompleted && idx === completedSteps.indexOf(false)
            const isClickable = idx === 0 || completedSteps.slice(0, idx).every(Boolean)

            return (
              <button
                key={step.id}
                onClick={() => handleStepClick(idx)}
                disabled={!isClickable}
                className={[
                  'flex-1 min-w-0 flex flex-col gap-[10px] items-start px-[14px] py-[12px] rounded-[10px] text-left transition-colors',
                  isActive
                    ? 'bg-white shadow-sm'
                    : isCompleted
                      ? 'bg-white/60 hover:bg-white/80'
                      : 'bg-transparent',
                  !isClickable ? 'cursor-default' : 'cursor-pointer',
                ].join(' ')}
              >
                <div
                  className={[
                    'flex items-center justify-center w-[28px] h-[28px] rounded-full shrink-0',
                    isCompleted || isCurrentTask ? 'bg-[#5e85ee]' : 'bg-[rgba(0,0,0,0.10)]',
                  ].join(' ')}
                >
                  {isCompleted ? (
                    <Check className="w-[14px] h-[14px] text-white" strokeWidth={2.5} />
                  ) : isCurrentTask ? (
                    <Zap className="w-[14px] h-[14px] text-white" strokeWidth={2} />
                  ) : (
                    <span className="text-[12px] font-semibold text-[rgba(0,0,0,0.30)] leading-none">{step.id}</span>
                  )}
                </div>
                <p
                  className={[
                    'text-[13px] leading-[18px] break-words',
                    isActive ? 'font-semibold text-[#1c1c26]' : 'text-[#606067]',
                  ].join(' ')}
                >
                  {step.label}
                </p>
              </button>
            )
          })}
        </div>

        {/* Active step detail */}
        <div className="bg-white rounded-[10px] px-[14px] py-[12px] flex items-center justify-between gap-[16px]">
          <p className="text-[13px] leading-[20px] text-[#1c1c26]">
            {activeStepDef.description}
          </p>
          <button
            onClick={handleAction}
            className="bg-[#5e85ee] hover:opacity-90 transition-opacity rounded-[10px] px-[12px] py-[8px] text-[13px] leading-[20px] text-white whitespace-nowrap shrink-0"
          >
            {activeStepDef.buttonText}
          </button>
        </div>
      </div>
    </div>
  )
}
