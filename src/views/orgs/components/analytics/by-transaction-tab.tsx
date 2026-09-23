import apis from '@/apis'
import type { ByTransactionStatisticsResponse } from '@/apis/statistics.api'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableScrollArea } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import useOrganizationStore from '@/stores/organization'
import { getRelativeExecutionDate, getRelativeExecutionDateTextClassName } from '@/utils/date'
import { useTranslation } from '@/utils/i18n'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  buildFrequencyTrend,
  buildNewThisMonthTrend,
  escapeCsvValue,
  formatCompactAmount,
  formatTokenAmount,
  formatUtcDate,
  formatUtcShortDate,
  getTransactionSymbol,
  getTranslatedRelativeExecutionDateLabel,
  PERIOD_OPTIONS,
  toChartNumber,
  truncateText,
  type TransactionChartPoint,
} from './analytics-utils'
import { AnalyticsExportButton, AnalyticsTopBar, MessageState, MetricCard } from './shared'

function LoadingState() {
  return (
    <div className="flex flex-col gap-[20px]">
      <div className="grid gap-[20px] xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="h-[128px] animate-pulse rounded-[28px] bg-white" />
        ))}
      </div>
      <div className="h-[400px] animate-pulse rounded-[32px] bg-white" />
      <div className="h-[320px] animate-pulse rounded-[32px] bg-white" />
    </div>
  )
}

function TransactionChartDot({
  cx,
  cy,
  index,
  totalPoints,
  payload,
}: {
  cx?: number
  cy?: number
  index?: number
  totalPoints: number
  payload?: TransactionChartPoint
}) {
  if (cx == null || cy == null || !payload) return null

  const isFirst = index === 0
  const isLast = index === totalPoints - 1
  const renderAbove = (index ?? 0) % 2 === 0
  const textAnchor = isFirst ? 'start' : isLast ? 'end' : 'middle'
  const textX = isFirst ? cx + 8 : isLast ? cx - 8 : cx
  const primaryTextY = renderAbove ? cy - 22 : cy + 18
  const secondaryTextY = renderAbove ? cy - 6 : cy + 34

  return (
    <g>
      <circle cx={cx} cy={cy} r={5} fill="#ffffff" stroke="#5e85ee" strokeWidth={3} />
      <text x={textX} y={primaryTextY} textAnchor={textAnchor} fill="#1c1c26" fontSize={12}>
        {payload.shortName}
      </text>
      <text x={textX} y={secondaryTextY} textAnchor={textAnchor} fill="#1c1c26" fontSize={12}>
        {payload.compactAmountLabel}
      </text>
    </g>
  )
}

export function ByTransactionTab({ tabsNav }: { tabsNav: ReactNode }) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { t } = useTranslation()
  const currentMember = useOrganizationStore(s => s.currentMember)

  const [selectedPeriodMonths, setSelectedPeriodMonths] = useState('6')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [stats, setStats] = useState<ByTransactionStatisticsResponse | null>(null)

  const canAccessAnalytics = useMemo(() => {
    const roles = currentMember?.roles.map(role => role.role) ?? []
    return roles.some(role => role === 'Owner' || role === 'Admin' || role === 'Operator')
  }, [currentMember])

  useEffect(() => {
    let cancelled = false

    if (!canAccessAnalytics) {
      setLoading(false)
      setErrorMessage(null)
      setStats(null)
      return
    }

    async function load() {
      try {
        setLoading(true)
        setErrorMessage(null)

        const response = await apis.statistics.getByTransactionStatistics({
          periodMonths: Number(selectedPeriodMonths),
        })

        if (cancelled) return
        setStats(response)
      } catch (error: any) {
        if (cancelled) return

        const status = error?.response?.status
        if (status === 403) {
          setErrorMessage(t('pages.analytics.ownerAdminOperatorOnly'))
        } else {
          setErrorMessage(t('pages.analytics.unableToLoadTransactionAnalytics'))
        }

        setStats(null)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [canAccessAnalytics, selectedPeriodMonths, t])

  const transactionNodes = useMemo(
    () =>
      [...(stats?.transactionNodes ?? [])].sort(
        (left, right) => new Date(left.analyticsDate).getTime() - new Date(right.analyticsDate).getTime()
      ),
    [stats]
  )

  const recentTransactions = useMemo(
    () =>
      [...(stats?.recentTransactions ?? [])].sort(
        (left, right) => new Date(right.analyticsDate).getTime() - new Date(left.analyticsDate).getTime()
      ),
    [stats]
  )

  const chartData = useMemo<TransactionChartPoint[]>(
    () =>
      transactionNodes.filter(node => node.amount !== null).map(node => {
        if (!node.amount) throw new Error('Missing chart amount')
        const decimals = node.amount.decimals ?? 0
        const symbol = getTransactionSymbol(node)
        const name = node.transactionName || t('pages.analytics.untitledTransaction')
        const relativeExecutionDate = getRelativeExecutionDate(node.analyticsDate)

        return {
          batchId: node.batchId,
          xAxisKey: `${node.batchId}-${node.analyticsDate}`,
          transactionName: name,
          shortName: truncateText(name, 18),
          executionDateLabel: getTranslatedRelativeExecutionDateLabel(relativeExecutionDate, t),
          xLabel: formatUtcShortDate(node.analyticsDate),
          amount: toChartNumber(node.amount.amount, decimals),
          amountLabel: `${formatTokenAmount(node.amount.amount, decimals)} ${symbol}`,
          compactAmountLabel: `${formatCompactAmount(node.amount.amount, decimals)} ${symbol}`,
          memberCount: node.memberCount,
        }
      }),
    [t, transactionNodes]
  )

  const totalTransactionsTrend = useMemo(() => buildNewThisMonthTrend(transactionNodes, t), [t, transactionNodes])
  const avgTransactionsTrend = useMemo(
    () => buildFrequencyTrend(stats?.totalTransactions ?? 0, Number(selectedPeriodMonths), t),
    [selectedPeriodMonths, stats, t]
  )

  const handleExport = () => {
    if (!stats) {
      toast({ description: t('pages.analytics.noTransactionExportData') })
      return
    }

    const rows = [
      [t('pages.analytics.transactionName'), t('pages.analytics.executionDate'), t('pages.analytics.amount'), 'Raw Amount', 'Symbol', t('pages.analytics.members'), 'Batch ID', 'caipChainId', 'tokenAddress'],
      ...recentTransactions.map(item => {
        const decimals = item.amount?.decimals ?? 0
        const symbol = item.amount ? getTransactionSymbol(item) : ''
        return [
          item.transactionName || '',
          formatUtcDate(item.analyticsDate),
          item.amount ? formatTokenAmount(item.amount.amount, decimals) : 'Private',
          item.amount?.amount ?? '',
          symbol,
          item.memberCount,
          item.batchId,
          item.amount?.caipChainId ?? '',
          item.amount?.tokenAddress ?? '',
        ]
      }),
    ]

    const csv = rows.map(row => row.map(escapeCsvValue).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `analytics-by-transaction-last-${selectedPeriodMonths}-months.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const renderContent = () => {
    if (!canAccessAnalytics) {
      return (
        <MessageState
          title={t('pages.analytics.accessRestricted')}
          description={t('pages.analytics.ownerAdminOperatorOnly')}
        />
      )
    }

    if (loading) {
      return <LoadingState />
    }

    if (errorMessage) {
      return <MessageState title={t('pages.analytics.unableToLoadAnalytics')} description={errorMessage} />
    }

    if (!stats || (chartData.length === 0 && recentTransactions.length === 0)) {
      const monthLabel = t(selectedPeriodMonths === '1' ? 'pages.analytics.monthSingular' : 'pages.analytics.monthPlural')
      return (
        <MessageState
          title={t('pages.analytics.noTransactionData')}
          description={t('pages.analytics.noTransactionDataDescription', { count: selectedPeriodMonths, monthLabel })}
        />
      )
    }

    return (
      <>
        <div className="grid gap-[20px] xl:grid-cols-2">
          <MetricCard title={t('pages.analytics.totalTransactions')} value={stats.totalTransactions.toLocaleString()} trend={totalTransactionsTrend} />
          <MetricCard title={t('pages.analytics.avgTransactionsPerMonth')} value={stats.avgTransactionsPerMonth.toLocaleString()} trend={avgTransactionsTrend} />
        </div>

        <div className="flex flex-col gap-[12px]">
          <div className="flex flex-col gap-[4px] md:flex-row md:items-center md:justify-between">
            <p className="text-[18px] leading-[28px] text-[#1c1c26]">{t('pages.analytics.transactionPayoutTrend')}</p>
            <p className="text-[14px] leading-[22px] text-[#606067] md:text-[16px] md:leading-[24px]">
              {t('pages.analytics.transactionExecutionDateAmount')}
            </p>
          </div>

          <div className="rounded-[32px] bg-white px-[12px] py-[24px] md:px-[24px] md:py-[32px]">
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 56, right: 28, left: 28, bottom: 88 }}>
                  <XAxis
                    dataKey="xAxisKey"
                    tickLine={false}
                    axisLine={false}
                    dy={24}
                    interval={0}
                    minTickGap={0}
                    padding={{ left: 24, right: 24 }}
                    tick={{ fill: '#8d8d93', fontSize: 14 }}
                    tickFormatter={value => chartData.find(item => item.xAxisKey === value)?.xLabel ?? ''}
                  />
                  <YAxis hide />
                  <Tooltip
                    cursor={false}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null

                      const point = payload[0].payload as TransactionChartPoint

                      return (
                        <div className="rounded-[12px] bg-[rgba(0,0,0,0.8)] px-[12px] py-[10px] text-[13px] leading-[20px] text-white shadow-[0px_10px_24px_rgba(0,0,0,0.18)]">
                          <div className="grid min-w-[240px] gap-[8px]">
                            <div className="flex items-center justify-between gap-[12px]">
                              <span className="text-[#bbbbbe]">{t('pages.analytics.transaction')}</span>
                              <span>{point.transactionName}</span>
                            </div>
                            <div className="flex items-center justify-between gap-[12px]">
                              <span className="text-[#bbbbbe]">{t('pages.analytics.executionDate')}</span>
                              <span>{point.executionDateLabel}</span>
                            </div>
                            <div className="flex items-center justify-between gap-[12px]">
                              <span className="text-[#bbbbbe]">{t('pages.analytics.amount')}</span>
                              <span>{point.amountLabel}</span>
                            </div>
                            <div className="flex items-center justify-between gap-[12px]">
                              <span className="text-[#bbbbbe]">{t('pages.analytics.totalMember')}</span>
                              <span>{point.memberCount}</span>
                            </div>
                          </div>
                        </div>
                      )
                    }}
                  />
                  <Line
                    type="linear"
                    dataKey="amount"
                    stroke="#5e85ee"
                    strokeWidth={2}
                    dot={props => <TransactionChartDot {...props} totalPoints={chartData.length} />}
                    activeDot={props => <TransactionChartDot {...props} totalPoints={chartData.length} />}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-[12px]">
          <p className="text-[18px] leading-[28px] text-[#1c1c26]">{t('pages.analytics.recentTransactionDetailsTable')}</p>

          <div className="overflow-hidden rounded-[32px] bg-white p-[24px]">
            <TableScrollArea>
              <Table className="min-w-[960px] w-full">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-0 text-[14px] font-normal text-[#8d8d93]">{t('pages.analytics.transactionName')}</TableHead>
                    <TableHead className="text-[14px] font-normal text-[#8d8d93]">{t('pages.analytics.executionDate')}</TableHead>
                    <TableHead className="text-[14px] font-normal text-[#8d8d93]">{t('pages.analytics.amount')}</TableHead>
                    <TableHead className="text-[14px] font-normal text-[#8d8d93]">{t('pages.analytics.members')}</TableHead>
                    <TableHead className="pr-0 text-[14px] font-normal text-[#8d8d93]">{t('pages.analytics.action')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTransactions.map(item => {
                    const decimals = item.amount?.decimals ?? 0
                    const symbol = item.amount ? getTransactionSymbol(item) : ''
                    const relativeExecutionDate = getRelativeExecutionDate(item.analyticsDate)
                    const relativeExecutionDateLabel = getTranslatedRelativeExecutionDateLabel(relativeExecutionDate, t)

                    return (
                      <TableRow key={item.batchId}>
                        <TableCell className="pl-0 text-[14px] text-[#1c1c26]">{item.transactionName || t('pages.analytics.untitledTransaction')}</TableCell>
                        <TableCell className={`text-[14px] ${getRelativeExecutionDateTextClassName(relativeExecutionDate.tone)}`}>
                          {relativeExecutionDateLabel}
                        </TableCell>
                        <TableCell className="text-[14px] text-[#1c1c26]">
                          {item.amount ? formatTokenAmount(item.amount.amount, decimals) : 'Private'} {symbol}
                        </TableCell>
                        <TableCell className="text-[14px] text-[#1c1c26]">{item.memberCount.toLocaleString()}</TableCell>
                        <TableCell className="pr-0">
                          <Button
                            variant="ghost"
                            className="h-auto px-0 py-0 text-[14px] font-normal text-[#5e85ee] hover:bg-transparent hover:text-[#4d69bd]"
                            onClick={() => navigate(`/orgs/transaction/${item.batchId}`)}
                          >
                            {t('pages.analytics.viewDetails')}
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableScrollArea>
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="flex flex-col gap-[20px] pb-[24px]">
      <AnalyticsTopBar
        tabsNav={tabsNav}
        actions={
          <>
            <Select value={selectedPeriodMonths} onValueChange={setSelectedPeriodMonths}>
              <SelectTrigger className="h-[36px] min-w-[180px] rounded-[12px] border-[rgba(0,0,0,0.12)] bg-white text-[14px] text-[#1c1c26] shadow-none focus:ring-0 focus:ring-offset-0 md:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-[16px]">
                {PERIOD_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <AnalyticsExportButton onClick={handleExport} />
          </>
        }
      />

      {renderContent()}
    </div>
  )
}
