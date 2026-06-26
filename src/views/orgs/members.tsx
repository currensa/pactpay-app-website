import AiApiPayeesTab from '@/views/orgs/components/ai-api/ai-api-payees-tab'
import { MembersPeopleTab } from '@/views/orgs/components/members-people-tab'
import { MembersTabsNav, type MembersTab } from '@/views/orgs/components/members-tabs-nav'
import { ENABLE_AI_API_FEATURES } from '@/constants/feature-flags'
import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

export default function MemberPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab: MembersTab = (ENABLE_AI_API_FEATURES && searchParams.get('tab') === 'ai-api') ? 'ai-api' : 'people'

  // Redirect to people tab if AI API is disabled but user is trying to access it
  useEffect(() => {
    if (!ENABLE_AI_API_FEATURES && searchParams.get('tab') === 'ai-api') {
      const next = new URLSearchParams(searchParams)
      next.delete('tab')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const handleTabChange = (tab: MembersTab) => {
    const next = new URLSearchParams(searchParams)
    if (tab === 'people') next.delete('tab')
    else if (ENABLE_AI_API_FEATURES) next.set('tab', 'ai-api')
    setSearchParams(next, { replace: true })
  }

  const tabsNav = <MembersTabsNav activeTab={activeTab} onTabChange={handleTabChange} />

  if (ENABLE_AI_API_FEATURES && activeTab === 'ai-api') {
    return <AiApiPayeesTab tabsNav={tabsNav} />
  }

  return <MembersPeopleTab tabsNav={tabsNav} />
}
