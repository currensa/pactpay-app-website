import { useTranslation } from '@/utils/i18n'

type TransactionsTab = 'all' | 'people' | 'ai'

type TransactionTabsNavProps = {
  activeTab: TransactionsTab
  onTabChange: (tab: TransactionsTab) => void
}

export function TransactionTabsNav({ activeTab, onTabChange }: TransactionTabsNavProps) {
  const { t } = useTranslation()

  const tabs = [
    { id: 'all' as const, label: t('pages.transactions.all'), enabled: true },
    { id: 'people' as const, label: t('pages.transactions.peoplePayment'), enabled: true },
    { id: 'ai' as const, label: t('pages.transactions.aiApiPurchases'), enabled: true },
  ]

  return (
    <div className="flex items-center gap-[10px] rounded-[24px] bg-[rgba(94,133,238,0.08)] p-[8px] w-fit">
      {tabs.map(tab => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={`rounded-[16px] px-[16px] py-[10px] text-[13px] font-medium transition-colors ${activeTab === tab.id ? 'bg-[#5e85ee] text-white' : 'text-[#5e85ee] hover:bg-white/80'
            }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
