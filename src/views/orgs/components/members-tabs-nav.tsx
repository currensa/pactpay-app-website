export type MembersTab = 'people' | 'ai-api'

type MembersTabsNavProps = {
  activeTab: MembersTab
  onTabChange: (tab: MembersTab) => void
}

export function MembersTabsNav({ activeTab, onTabChange }: MembersTabsNavProps) {
  return (
    <div className="flex w-fit items-center gap-[10px] rounded-[24px] bg-[rgba(94,133,238,0.08)] p-[8px]">
      <button
        type="button"
        onClick={() => onTabChange('people')}
        className={`rounded-[16px] px-[16px] py-[10px] text-[13px] font-medium transition-colors ${
          activeTab === 'people' ? 'bg-[#5e85ee] text-white' : 'text-[#5e85ee] hover:bg-white/80'
        }`}
      >
        People
      </button>
      <button
        type="button"
        onClick={() => onTabChange('ai-api')}
        className={`rounded-[16px] px-[16px] py-[10px] text-[13px] font-medium transition-colors ${
          activeTab === 'ai-api' ? 'bg-[#5e85ee] text-white' : 'text-[#5e85ee] hover:bg-white/80'
        }`}
      >
        AI API
      </button>
      <button
        type="button"
        disabled
        className="inline-flex cursor-not-allowed items-center gap-[8px] rounded-[16px] px-[16px] py-[10px] text-[13px] font-medium text-[#9db2f1]"
      >
        Cloud Services
        <span className="rounded-full bg-white/80 px-[8px] py-[2px] text-[11px] text-[#7f99e8]">Coming soon</span>
      </button>
    </div>
  )
}
