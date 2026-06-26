import { Button } from '@/components/ui/button'
import type { I18nKey } from '@/i18n/messages'
import { ENABLE_AI_API_FEATURES } from '@/constants/feature-flags'
import useHeaderStore from '@/stores/header'
import { useTranslation } from '@/utils/i18n'
import { Bot, CalendarDays, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

type TransactionType = 'people' | 'ai'

const TYPE_OPTIONS: {
  id: TransactionType
  titleKey: I18nKey
  descriptionKey: I18nKey
  continueTo: string
  summaryItems: { labelKey: I18nKey; valueKey: I18nKey }[]
  icon: typeof Users
  iconLabelKey: I18nKey
  enabled: boolean
}[] = [
  {
    id: 'people',
    titleKey: 'pages.createTransactionSelector.peoplePayroll',
    descriptionKey: 'pages.createTransactionSelector.peopleDescription',
    continueTo: '/orgs/transaction/create-people',
    summaryItems: [
      { labelKey: 'pages.createTransactionSelector.paymentTypeLabel', valueKey: 'pages.createTransactionSelector.peoplePayroll' },
      { labelKey: 'pages.createTransactionSelector.payeesLabel', valueKey: 'pages.createTransactionSelector.organizationMembers' },
      { labelKey: 'pages.createTransactionSelector.platformFeeLabel', valueKey: 'pages.createTransactionSelector.platformFeeApplied' },
      { labelKey: 'pages.createTransactionSelector.claimTimingLabel', valueKey: 'pages.createTransactionSelector.claimTimingRequired' },
    ],
    icon: Users,
    iconLabelKey: 'pages.createTransactionSelector.peoplePayment',
    enabled: true,
  },
  {
    id: 'ai',
    titleKey: 'pages.createTransactionSelector.aiPurchase',
    descriptionKey: 'pages.createTransactionSelector.aiDescription',
    continueTo: '/orgs/transaction/create-ai',
    summaryItems: [
      { labelKey: 'pages.createTransactionSelector.paymentTypeLabel', valueKey: 'pages.createTransactionSelector.aiPurchase' },
      { labelKey: 'pages.createTransactionSelector.payeesLabel', valueKey: 'pages.createTransactionSelector.apiServiceUsagePlan' },
      { labelKey: 'pages.createTransactionSelector.platformFeeLabel', valueKey: 'pages.createTransactionSelector.none' },
      { labelKey: 'pages.createTransactionSelector.refundPolicyLabel', valueKey: 'pages.createTransactionSelector.noRefunds' },
    ],
    icon: Bot,
    iconLabelKey: 'pages.createTransactionSelector.aiPurchase',
    enabled: ENABLE_AI_API_FEATURES,
  },
]

export default function CreateTransactionSelector() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setHeader, clearHeader } = useHeaderStore()
  const initialType = searchParams.get('type')
  const [selectedType, setSelectedType] = useState<TransactionType | null>(
    (initialType === 'people' || (ENABLE_AI_API_FEATURES && initialType === 'ai')) ? initialType : null,
  )

  // Redirect if AI type is selected but AI API features are disabled
  useEffect(() => {
    if (!ENABLE_AI_API_FEATURES && initialType === 'ai') {
      navigate('/orgs/transaction/create', { replace: true })
    }
  }, [initialType, navigate])

  useEffect(() => {
    setHeader({
      backUrl: '/orgs/transaction',
      steps: [
        { label: t('pages.createTransactionSelector.step1'), active: true },
        { label: t('pages.createTransactionSelector.step2'), active: false },
      ],
    })
    return () => clearHeader()
  }, [clearHeader, setHeader, t])

  const selectedOption = useMemo(
    () => TYPE_OPTIONS.find(option => option.id === selectedType) ?? null,
    [selectedType],
  )

  return (
    <div className="rounded-[24px] bg-white md:rounded-[32px]">
      <div className="grid min-h-[620px] lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.9fr)]">
        <div className="p-[16px] md:p-[32px]">
          <div className="flex flex-wrap items-center gap-[12px] border-b border-[rgba(0,0,0,0.08)] pb-[16px] md:gap-[16px] md:pb-[20px]">
            <div className="flex items-center gap-[8px] md:gap-[10px]">
              <span className="flex h-[30px] min-w-[30px] items-center justify-center rounded-full bg-[#5e85ee] px-[8px] text-[13px] font-semibold text-white">
                1
              </span>
              <span className="text-[14px] font-medium text-[#5e85ee]">{t('pages.createTransactionSelector.paymentType')}</span>
            </div>
            <span className="text-[14px] text-[#c0c0c5]">/</span>
            <div className="flex items-center gap-[8px] md:gap-[10px]">
              <span className="text-[14px] font-medium text-[#a4a4a8]">2</span>
              <span className="text-[14px] font-medium text-[#a4a4a8]">{t('pages.createTransactionSelector.details')}</span>
            </div>
          </div>

          <div className="pt-[20px] md:pt-[28px]">
            <p className="text-[18px] font-semibold text-[#1c1c26]">{t('pages.createTransactionSelector.question')}</p>

            <div className="mt-[16px] grid gap-[12px] md:mt-[20px] md:gap-[16px] xl:grid-cols-2">
              {TYPE_OPTIONS.map(option => {
                const Icon = option.icon
                const selected = selectedType === option.id
                const isDisabled = !option.enabled

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => !isDisabled && setSelectedType(option.id)}
                    disabled={isDisabled}
                    className={`rounded-[24px] border p-[16px] text-left transition-colors md:p-[20px] ${
                      isDisabled
                        ? 'cursor-not-allowed border-[rgba(0,0,0,0.06)] bg-[rgba(0,0,0,0.02)]'
                        : selected
                        ? 'border-[#5e85ee] bg-[rgba(94,133,238,0.06)]'
                        : 'border-[rgba(0,0,0,0.08)] bg-white hover:bg-[#f8f8fb]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-[12px] md:gap-[16px]">
                      <div className={`flex h-[48px] w-[48px] items-center justify-center rounded-[16px] md:h-[56px] md:w-[56px] md:rounded-[18px] ${
                        isDisabled ? 'bg-[rgba(0,0,0,0.04)]' : 'bg-[rgba(94,133,238,0.08)]'
                      }`}>
                        <Icon className={`h-[24px] w-[24px] ${isDisabled ? 'text-[#a4a4a8]' : 'text-[#5e85ee]'}`} />
                      </div>
                      <span
                        className={`mt-[4px] h-[24px] w-[24px] rounded-full border transition-colors ${
                          isDisabled
                            ? 'border-[rgba(0,0,0,0.06)] bg-[rgba(0,0,0,0.02)]'
                            : selected
                            ? 'border-[#5e85ee] bg-[#5e85ee]'
                            : 'border-[rgba(0,0,0,0.12)] bg-white'
                        }`}
                        aria-hidden="true"
                      />
                    </div>

                    <div className="mt-[28px] md:mt-[44px]">
                      <p className={`text-[16px] font-semibold md:text-[18px] ${isDisabled ? 'text-[#a4a4a8]' : 'text-[#1c1c26]'}`}>
                        {t(option.titleKey)}
                      </p>
                      <p className={`mt-[6px] text-[14px] leading-[22px] ${isDisabled ? 'text-[#c0c0c5]' : 'text-[#8d8d93]'}`}>
                        {t(option.descriptionKey)}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-[24px] flex flex-col-reverse gap-[10px] border-t border-[rgba(0,0,0,0.08)] pt-[16px] md:mt-[32px] md:flex-row md:items-center md:justify-between md:pt-[20px]">
            <Button variant="outline" className="w-full md:w-auto" onClick={() => navigate('/orgs/transaction')}>
              {t('common.cancel')}
            </Button>
            <Button
              className="w-full md:w-auto"
              disabled={!selectedOption}
              onClick={() => {
                if (!selectedOption) return
                navigate(selectedOption.continueTo)
              }}
            >
              {t('pages.createTransactionSelector.continue')}
            </Button>
          </div>
        </div>

        <div className="border-t border-[rgba(0,0,0,0.08)] p-[16px] md:p-[32px] lg:border-l lg:border-t-0">
          {selectedOption ? (
            <div className="flex h-full flex-col">
              <div className="flex items-center gap-[12px]">
                <div className="flex h-[48px] w-[48px] items-center justify-center rounded-[16px] bg-[rgba(94,133,238,0.08)]">
                  <selectedOption.icon className="h-[22px] w-[22px] text-[#5e85ee]" />
                </div>
                <div>
                  <p className="text-[18px] font-semibold text-[#1c1c26]">{t(selectedOption.titleKey)}</p>
                  <p className="text-[13px] leading-[20px] text-[#8d8d93]">{t(selectedOption.iconLabelKey)}</p>
                </div>
              </div>

              <div className="mt-[20px] rounded-[24px] bg-[#f5f5f5] p-[18px]">
                <p className="text-[13px] font-medium uppercase tracking-[0.08em] text-[#8d8d93]">{t('pages.createTransactionSelector.feeBreakdown')}</p>
                <div className="mt-[16px] flex flex-col gap-[14px]">
                  {selectedOption.summaryItems.map(item => (
                    <div key={item.labelKey} className="flex items-start justify-between gap-[16px]">
                      <span className="text-[13px] text-[#606067]">{t(item.labelKey)}</span>
                      <span className="max-w-[220px] text-right text-[13px] text-[#1c1c26]">{t(item.valueKey)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[240px] flex-col items-center justify-center text-center">
              <div className="flex h-[64px] w-[64px] items-center justify-center rounded-[20px] border border-[rgba(0,0,0,0.08)]">
                <CalendarDays className="h-[28px] w-[28px] text-[#a4a4a8]" />
              </div>
              <p className="mt-[20px] text-[16px] font-medium text-[#a4a4a8]">
                {t('pages.createTransactionSelector.selectTypeHint')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
