import apis from '@/apis'
import { Check, ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface StepDef {
  id: number
  label: string
  description: string
  buttonText: string
  navigateTo: string | null
  isExternal?: boolean
}

const STEPS: StepDef[] = [
  {
    id: 1,
    label: 'Join an organisation',
    description: 'Sign up via an invite link, or enter an invite code during registration.',
    buttonText: 'Got it',
    navigateTo: null,
  },
  {
    id: 2,
    label: 'Get verified by organisation owner',
    description: "Once you join an organisation, your owner will verify your membership. You'll receive an email when approved.",
    buttonText: 'Go to set up email',
    navigateTo: '/member/settings',
  },
  {
    id: 3,
    label: 'Bind your wallet',
    description: 'Add your signing wallet address in Account settings. The address to receive your funds can be entered at the time of claim.',
    buttonText: 'Go to Account',
    navigateTo: '/member/settings',
  },
  {
    id: 4,
    label: 'Learn how claiming works',
    description: 'Your org sends payroll on-chain. Funds go directly to your wallet — no intermediary.',
    buttonText: 'Read the tutorial',
    navigateTo: 'https://docs.pactpay.app',
    isExternal: true,
  },
  {
    id: 5,
    label: 'Claim your first payment',
    description: "When your org runs payroll, you'll be able to claim it when pay time arrives.",
    buttonText: 'Got it',
    navigateTo: null,
  },
]

export function MemberOnboardingGuide() {
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState<boolean | null>(null) // null = loading
  const [completedSteps, setCompletedSteps] = useState<boolean[]>([false, false, false, false, false])

  useEffect(() => {
    loadGuide()
  }, [])

  useEffect(() => {
    const handler = () => {
      apis.onboarding.patchGuide({ dismissed: false }).catch(() => { })
      setDismissed(false)
    }
  }, [])

  const loadGuide = async () => {
    try {
      const record = await apis.onboarding.getGuide()
      setDismissed(record.dismissed)
      if (!record.dismissed) checkSteps()
    } catch {
      setDismissed(false)
      checkSteps()
    }
  }

  const checkSteps = async () => {
    try {
      const [orgs, metaPubStatus, summary] = await Promise.allSettled([
        apis.organization.getOrganizations(),
        apis.auth.getMetaPubStatus(),
        apis.transaction.getMySummary(),
      ])

      const orgList = orgs.status === 'fulfilled' ? orgs.value : []
      const step1Done = orgList.length > 0
      const Accounts = await apis.auth.getUserAuths()
      const step2Done = !!Accounts.find(o => o.type === 'email')
      const step3Done = metaPubStatus.status === 'fulfilled' ? (metaPubStatus.value?.submitted ?? false) : false
      const step5Done = summary.status === 'fulfilled' ? ((summary.value?.claimed?.length ?? 0) > 0) : false

      setCompletedSteps([step1Done, step2Done, step3Done, false, step5Done])
    } catch {
      // silently ignore
    }
  }

  const handleDismiss = async () => {
    setDismissed(true)
    await apis.onboarding.patchGuide({ dismissed: true }).catch(() => { })
  }

  const handleAction = (idx: number) => {
    const step = STEPS[idx]
    if (step.isExternal && step.navigateTo) {
      window.open(step.navigateTo, '_blank', 'noopener,noreferrer')
    } else if (step.navigateTo) {
      navigate(step.navigateTo)
    } else {
      setCompletedSteps(prev => {
        const next = [...prev]
        next[idx] = true
        return next
      })
    }
  }

  if (dismissed === null || dismissed) return null

  return (
    <div className="flex gap-[20px] items-start bg-white border border-[rgba(94,133,238,0.10)] rounded-[28px] pl-[28px] pr-[20px] py-[20px] overflow-hidden">
      {/* Left: title + dismiss */}
      <div className="flex flex-col items-start justify-between py-[8px] self-stretch shrink-0 w-[150px]">
        <div className="flex flex-col gap-[8px]">
          <div>
            <p className="font-['Poppins',sans-serif] text-[18px] leading-[26px] text-[#bbbbbe] tracking-[-0.36px]">Get start with</p>
            <p className="font-['Poppins',sans-serif] font-semibold text-[32px] leading-none text-[#1c1c26] tracking-[-0.64px]">PactPay</p>
          </div>
          <p className="text-[12px] leading-[18px] text-[#8d8d93]">
            Learn how you receive your first payment with PactPay.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="border border-[rgba(0,0,0,0.12)] rounded-[10px] px-[14px] py-[8px] text-[13px] leading-[20px] text-[#1c1c26] hover:bg-[#f5f5f5] transition-colors"
        >
          Dismiss
        </button>
      </div>

      {/* Right: step cards */}
      <div className="flex-1 min-w-0 flex gap-[12px] bg-[rgba(94,133,238,0.04)] rounded-[18px] px-[20px] py-[16px]">
        {STEPS.map((step, idx) => {
          const isCompleted = completedSteps[idx]

          return (
            <div
              key={step.id}
              className="flex flex-col items-start justify-between p-[14px] rounded-[12px] flex-1 min-w-[160px] bg-white"
            >
              {/* Top: badge + title + description */}
              <div className="flex flex-col gap-[8px] w-full">
                <div
                  className={[
                    'flex items-center justify-center w-[28px] h-[28px] rounded-full shrink-0',
                    isCompleted ? 'bg-[#5e85ee]' : 'bg-[rgba(0,0,0,0.10)]',
                  ].join(' ')}
                >
                  {isCompleted ? (
                    <Check className="w-[13px] h-[13px] text-white" strokeWidth={2.5} />
                  ) : (
                    <span className="text-[12px] font-semibold text-[rgba(0,0,0,0.30)] leading-none">{step.id}</span>
                  )}
                </div>

                <div className="flex flex-col gap-[3px]">
                  <p className="text-[13px] leading-[18px] font-semibold text-[#1c1c26]">
                    {step.label}
                  </p>
                  <p className="text-[12px] leading-[17px] text-[#8d8d93]">
                    {step.description}
                  </p>
                </div>
              </div>

              {/* Bottom: action button — hidden when completed */}
              {!isCompleted && (
                <div className="mt-[12px]">
                  {step.isExternal ? (
                    <button
                      onClick={() => handleAction(idx)}
                      className="flex items-center gap-[4px] text-[13px] leading-[20px] text-[#5e85ee] hover:opacity-80 transition-opacity"
                    >
                      <ExternalLink className="w-[13px] h-[13px]" />
                      {step.buttonText}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAction(idx)}
                      className="rounded-[10px] px-[10px] py-[8px] text-[13px] leading-[20px] bg-[#5e85ee] text-white hover:opacity-90 transition-opacity"
                    >
                      {step.buttonText}
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
