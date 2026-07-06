import AiApiPayeesTab from '@/views/orgs/components/ai-api/ai-api-payees-tab'
import { MembersPeopleTab } from '@/views/orgs/components/members-people-tab'
import { MembersTabsNav, type MembersTab } from '@/views/orgs/components/members-tabs-nav'
import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

export default function MemberPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab: MembersTab = searchParams.get('tab') === 'ai-api' ? 'ai-api' : 'people'


  const handleTabChange = (tab: MembersTab) => {
    const next = new URLSearchParams(searchParams)
    if (tab === 'people') next.delete('tab')
    else next.set('tab', 'ai-api')
    setSearchParams(next, { replace: true })
  }

  const tabsNav = <MembersTabsNav activeTab={activeTab} onTabChange={handleTabChange} />

  if (activeTab === 'ai-api') {
    return <AiApiPayeesTab tabsNav={tabsNav} />
  }

  return <MembersPeopleTab tabsNav={tabsNav} />
}
