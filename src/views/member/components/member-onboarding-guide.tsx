import apis from '@/apis'
import type { I18nKey } from '@/i18n/messages'
import useOrganizationStore from '@/stores/organization'
import { useTranslation } from '@/utils/i18n'
import { Check, ExternalLink } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'

interface StepDef {
  id: number
  labelKey: I18nKey
  descriptionKey: I18nKey
  buttonKey: I18nKey
  navigateTo: string | null
  isExternal?: boolean
}
const STEPS: StepDef[] = [
  {
    id: 1,
    labelKey: 'pages.memberOnboardingGuide.steps.joinOrg.label',
    descriptionKey: 'pages.memberOnboardingGuide.steps.joinOrg.description',
    buttonKey: 'pages.memberOnboardingGuide.steps.joinOrg.button',
    navigateTo: null,
  },
  {
    id: 2,
    labelKey: 'pages.memberOnboardingGuide.steps.bindWallet.label',
    descriptionKey: 'pages.memberOnboardingGuide.steps.bindWallet.description',
    buttonKey: 'pages.memberOnboardingGuide.steps.bindWallet.button',
    navigateTo: '/member/settings',
  },
  {
    id: 3,
    labelKey: 'pages.memberOnboardingGuide.steps.verify.label',
    descriptionKey: 'pages.memberOnboardingGuide.steps.verify.description',
    buttonKey: 'pages.memberOnboardingGuide.steps.verify.button',
    navigateTo: '/member/settings',
  },
  {
    id: 4,
    labelKey: 'pages.memberOnboardingGuide.steps.tutorial.label',
    descriptionKey: 'pages.memberOnboardingGuide.steps.tutorial.description',
    buttonKey: 'pages.memberOnboardingGuide.steps.tutorial.button',
    navigateTo: '/document#for-members',
    isExternal: true,
  },
  {
    id: 5,
    labelKey: 'pages.memberOnboardingGuide.steps.firstPayment.label',
    descriptionKey: 'pages.memberOnboardingGuide.steps.firstPayment.description',
    buttonKey: 'pages.memberOnboardingGuide.steps.firstPayment.button',
    navigateTo: null,
  },
]

export function MemberOnboardingGuide() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [dismissed, setDismissed] = useState<boolean | null>(null) // null = loading
  const [completedSteps, setCompletedSteps] = useState<boolean[]>([false, false, false, false, false])
  const [hasPendingClaim, setHasPendingClaim] = useState(false)
  const [stepsLoading, setStepsLoading] = useState(true)
  const [visible, setVisible] = useState(true)
  const [showCongrats, setShowCongrats] = useState(false)
  const hasAutoSaved = useRef(false)
  const { organizations } = useOrganizationStore()
  useEffect(() => {
    loadGuide()
  }, [])

  // When all steps done: show toast when tab is visible, then auto-dismiss after toast ends.
  // If the tab is hidden while the toast is counting down, reset and replay when user returns.
  useEffect(() => {
    if (!completedSteps.every(Boolean)) return

    if (!hasAutoSaved.current) {
      hasAutoSaved.current = true
      apis.onboarding.patchGuide({ dismissed: true }).catch(() => { })
    }

    let dismissTimer: ReturnType<typeof setTimeout> | null = null

    const startToast = () => {
      setShowCongrats(true)
      dismissTimer = setTimeout(() => {
        setShowCongrats(false)
        startDismissAnimation()
      }, 3000)
    }

    const onVisibilityChange = () => {
      if (document.hidden) {
        if (dismissTimer) { clearTimeout(dismissTimer); dismissTimer = null }
        setShowCongrats(false)
      } else {
        startToast()
      }
    }

    if (!document.hidden) startToast()

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      if (dismissTimer) clearTimeout(dismissTimer)
    }
  }, [completedSteps])

  const startDismissAnimation = () => {
    setVisible(false)
    setTimeout(() => setDismissed(true), 500)
  }

  const loadGuide = async () => {
    try {
      const record = await apis.onboarding.getGuide()
      setDismissed(record.dismissed)
    } catch {
      setDismissed(false)
    }
    checkSteps([])
  }

  const checkSteps = async (serverCompleted: string[]) => {
    try {
      setStepsLoading(true)
      const [privacyProfileStatus, summary] = await Promise.allSettled([
        apis.auth.getGravArcUserInfoStatus(),
        apis.transaction.getMySummary(),
      ])

      const step1Done = organizations.length > 0
      const Accounts = await apis.auth.getUserAuths()
      const step2Done = privacyProfileStatus.status === 'fulfilled' ? (privacyProfileStatus.value?.submitted ?? false) : false
      const step3Done = !!Accounts.find(o => o.type === 'email')
      const step5Done = summary.status === 'fulfilled' ? ((summary.value?.claimed?.length ?? 0) > 0) : false
      // Step 4 (index 3): persisted server-side only
      const step4Done = serverCompleted.includes('4')

      const hasPending = summary.status === 'fulfilled' ? ((summary.value?.pendingClaim?.length ?? 0) > 0) : false
      setHasPendingClaim(hasPending)

      const newCompleted = [step1Done, step2Done, step3Done, step4Done, step5Done]
      setCompletedSteps(newCompleted)
    } catch {
      // silently ignore
    } finally {
      setStepsLoading(false)
    }
  }

  const saveCompletedSteps = (next: boolean[]) => {
    const ids = next.map((done, i) => (done ? String(i + 1) : null)).filter(Boolean) as string[]
    apis.onboarding.patchGuide({ completedSteps: ids }).catch(() => { })
  }

  const handleDismiss = async () => {
    await apis.onboarding.patchGuide({ dismissed: true }).catch(() => { })
    startDismissAnimation()
  }

  const handleAction = (idx: number) => {
    const step = STEPS[idx]
    if (step.isExternal && step.navigateTo) {
      window.open(step.navigateTo, '_blank', 'noopener,noreferrer')
      // Mark step 4 (idx=3) as done after clicking
      setCompletedSteps(prev => {
        const next = [...prev]
        next[idx] = true
        saveCompletedSteps(next)
        return next
      })
    } else if (step.navigateTo) {
      navigate(step.navigateTo)
    } else if (step.id === 5) {
      navigate('/member/claim')
    } else {
      setCompletedSteps(prev => {
        const next = [...prev]
        next[idx] = true
        saveCompletedSteps(next)
        return next
      })
    }
  }

  if (dismissed === null || dismissed) return null

  return (
    <>
      {showCongrats && createPortal(
        <div
          className="fixed top-6 left-0 right-0 mx-auto w-fit z-[9999] px-5 py-3 rounded-[14px] bg-[#1c1c26] text-white text-[14px] font-medium shadow-lg pointer-events-none select-none"
          style={{ animation: 'fadeInDown 0.25s ease' }}
        >
          {t('pages.memberOnboardingGuide.toastReady')}
        </div>,
        document.body
      )}
      <div
        className="flex gap-[20px] items-start bg-white border border-[rgba(94,133,238,0.10)] rounded-[28px] pl-[28px] pr-[20px] py-[20px] overflow-hidden transition-all duration-500"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(-12px)',
        }}
      >
        {/* Left: title + dismiss */}
        <div className="flex flex-col items-start justify-between py-[8px] self-stretch shrink-0 w-[150px]">
          <div className="flex flex-col gap-[8px]">
            <div>
              <p className="font-['Poppins',sans-serif] text-[18px] leading-[26px] text-[#bbbbbe] tracking-[-0.36px]">{t('pages.memberOnboardingGuide.getStartWith')}</p>
              <p className="font-['Poppins',sans-serif] font-semibold text-[32px] leading-none text-[#1c1c26] tracking-[-0.64px]">PactPay</p>
            </div>
            <p className="text-[12px] leading-[18px] text-[#8d8d93]">
              {t('pages.memberOnboardingGuide.description')}
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="border border-[rgba(0,0,0,0.12)] rounded-[10px] px-[14px] py-[8px] text-[13px] leading-[20px] text-[#1c1c26] hover:bg-[#f5f5f5] transition-colors"
          >
            {t('pages.memberOnboardingGuide.dismiss')}
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
                      'flex items-center justify-center w-[28px] h-[28px] rounded-full shrink-0 transition-colors duration-300',
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
                      {t(step.labelKey)}
                    </p>
                    <p className="text-[12px] leading-[17px] text-[#8d8d93]">
                      {t(step.descriptionKey)}
                    </p>
                  </div>
                </div>

                {/* Bottom: action button — hidden when completed */}
                {(!isCompleted || step.id === 4) && (
                  <div className="mt-[12px]">
                    {step.isExternal ? (
                      <button
                        onClick={() => handleAction(idx)}
                        className="flex items-center gap-[4px] text-[13px] leading-[20px] text-[#5e85ee] hover:opacity-80 transition-opacity"
                      >
                        <ExternalLink className="w-[13px] h-[13px]" />
                        {t(step.buttonKey)}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAction(idx)}
                        disabled={step.id === 5 && (stepsLoading || !hasPendingClaim)}
                        className="rounded-[10px] px-[10px] py-[8px] text-[13px] leading-[20px] bg-[#5e85ee] text-white hover:opacity-90 transition-opacity disabled:opacity-40"
                      >
                        {t(step.buttonKey)}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
