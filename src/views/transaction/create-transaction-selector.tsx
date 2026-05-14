import { Button } from '@/components/ui/button'
import useHeaderStore from '@/stores/header'
import { Bot, CalendarDays, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

type TransactionType = 'people' | 'ai'

const TYPE_OPTIONS: {
  id: TransactionType
  title: string
  description: string
  continueTo: string
  summaryItems: { label: string; value: string }[]
  icon: typeof Users
  iconLabel: string
}[] = [
  {
    id: 'people',
    title: 'People payroll',
    description: 'Pay team members. Claim time required. Platform service fee applies.',
    continueTo: '/orgs/transaction/create-people',
    summaryItems: [
      { label: 'Payment type', value: 'People payroll' },
      { label: 'Payees', value: 'Organisation members' },
      { label: 'Platform fee', value: 'Applied at transaction creation' },
      { label: 'Claim timing', value: 'Required before members can claim' },
    ],
    icon: Users,
    iconLabel: 'People payment',
  },
  {
    id: 'ai',
    title: 'AI API purchase',
    description: 'Top up a usage plan. Direct payment. No platform fee. No refunds.',
    continueTo: '/orgs/transaction/create-ai',
    summaryItems: [
      { label: 'Payment type', value: 'AI API purchase' },
      { label: 'Payees', value: 'API service usage plan' },
      { label: 'Platform fee', value: 'None' },
      { label: 'Refund policy', value: 'No refunds after payment' },
    ],
    icon: Bot,
    iconLabel: 'AI API purchase',
  },
]

export default function CreateTransactionSelector() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setHeader, clearHeader } = useHeaderStore()
  const initialType = searchParams.get('type')
  const [selectedType, setSelectedType] = useState<TransactionType | null>(
    initialType === 'people' || initialType === 'ai' ? initialType : null,
  )

  useEffect(() => {
    setHeader({
      backUrl: '/orgs/transaction',
      steps: [
        { label: '1. Select type & details', active: true },
        { label: '2. Review & Confirm', active: false },
      ],
    })
    return () => clearHeader()
  }, [clearHeader, setHeader])

  const selectedOption = useMemo(
    () => TYPE_OPTIONS.find(option => option.id === selectedType) ?? null,
    [selectedType],
  )

  return (
    <div className="rounded-[32px] bg-white">
      <div className="grid min-h-[620px] lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.9fr)]">
        <div className="p-[24px] md:p-[32px]">
          <div className="flex items-center gap-[16px] border-b border-[rgba(0,0,0,0.08)] pb-[20px]">
            <div className="flex items-center gap-[10px]">
              <span className="flex h-[30px] min-w-[30px] items-center justify-center rounded-full bg-[#5e85ee] px-[8px] text-[13px] font-semibold text-white">
                1
              </span>
              <span className="text-[14px] font-medium text-[#5e85ee]">Payment type</span>
            </div>
            <span className="text-[14px] text-[#c0c0c5]">/</span>
            <div className="flex items-center gap-[10px]">
              <span className="text-[14px] font-medium text-[#a4a4a8]">2</span>
              <span className="text-[14px] font-medium text-[#a4a4a8]">Details</span>
            </div>
          </div>

          <div className="pt-[28px]">
            <p className="text-[18px] font-semibold text-[#1c1c26]">What are you paying for?</p>

            <div className="mt-[20px] grid gap-[16px] xl:grid-cols-2">
              {TYPE_OPTIONS.map(option => {
                const Icon = option.icon
                const selected = selectedType === option.id

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSelectedType(option.id)}
                    className={`rounded-[24px] border p-[20px] text-left transition-colors ${
                      selected
                        ? 'border-[#5e85ee] bg-[rgba(94,133,238,0.06)]'
                        : 'border-[rgba(0,0,0,0.08)] bg-white hover:bg-[#f8f8fb]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-[16px]">
                      <div className="flex h-[56px] w-[56px] items-center justify-center rounded-[18px] bg-[rgba(94,133,238,0.08)]">
                        <Icon className="h-[24px] w-[24px] text-[#5e85ee]" />
                      </div>
                      <span
                        className={`mt-[4px] h-[24px] w-[24px] rounded-full border transition-colors ${
                          selected ? 'border-[#5e85ee] bg-[#5e85ee]' : 'border-[rgba(0,0,0,0.12)] bg-white'
                        }`}
                        aria-hidden="true"
                      />
                    </div>

                    <div className="mt-[44px]">
                      <p className="text-[18px] font-semibold text-[#1c1c26]">{option.title}</p>
                      <p className="mt-[6px] text-[14px] leading-[22px] text-[#8d8d93]">{option.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-[32px] flex items-center justify-between border-t border-[rgba(0,0,0,0.08)] pt-[20px]">
            <Button variant="outline" onClick={() => navigate('/orgs/transaction')}>
              Cancel
            </Button>
            <Button
              disabled={!selectedOption}
              onClick={() => {
                if (!selectedOption) return
                navigate(selectedOption.continueTo, {
                  state: { backUrl: `/orgs/transaction/create?type=${selectedOption.id}` },
                })
              }}
            >
              Continue
            </Button>
          </div>
        </div>

        <div className="border-t border-[rgba(0,0,0,0.08)] p-[24px] md:p-[32px] lg:border-l lg:border-t-0">
          {selectedOption ? (
            <div className="flex h-full flex-col">
              <div className="flex items-center gap-[12px]">
                <div className="flex h-[48px] w-[48px] items-center justify-center rounded-[16px] bg-[rgba(94,133,238,0.08)]">
                  <selectedOption.icon className="h-[22px] w-[22px] text-[#5e85ee]" />
                </div>
                <div>
                  <p className="text-[18px] font-semibold text-[#1c1c26]">{selectedOption.title}</p>
                  <p className="text-[13px] leading-[20px] text-[#8d8d93]">{selectedOption.iconLabel}</p>
                </div>
              </div>

              <div className="mt-[20px] rounded-[24px] bg-[#f5f5f5] p-[18px]">
                <p className="text-[13px] font-medium uppercase tracking-[0.08em] text-[#8d8d93]">Fee breakdown</p>
                <div className="mt-[16px] flex flex-col gap-[14px]">
                  {selectedOption.summaryItems.map(item => (
                    <div key={item.label} className="flex items-start justify-between gap-[16px]">
                      <span className="text-[13px] text-[#606067]">{item.label}</span>
                      <span className="max-w-[220px] text-right text-[13px] text-[#1c1c26]">{item.value}</span>
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
                Select a payment type to see fee breakdown
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
