import { useState } from 'react'
import { ByTimeTab } from './components/analytics/by-time-tab'
import { ByTransactionTab } from './components/analytics/by-transaction-tab'
import { MemberHistoryTab } from './components/analytics/member-history-tab'
import { TransactionExecutionsTab } from './components/analytics/transaction-executions-tab'
import type { AnalyticsTab } from './components/analytics/analytics-utils'
import { AnalyticsTabsNav } from './components/analytics/shared'

export default function Analytics() {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('time')

  const tabsNav = <AnalyticsTabsNav activeTab={activeTab} onTabChange={setActiveTab} />

  if (activeTab === 'time') {
    return <ByTimeTab tabsNav={tabsNav} />
  }

  if (activeTab === 'transaction') {
    return <ByTransactionTab tabsNav={tabsNav} />
  }

  if (activeTab === 'executions') {
    return <TransactionExecutionsTab tabsNav={tabsNav} />
  }

  return <MemberHistoryTab tabsNav={tabsNav} />
}
